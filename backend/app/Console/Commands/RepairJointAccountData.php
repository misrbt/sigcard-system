<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\CustomerDocument;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Keeps joint accounts saved before the November 2026 joint-account changes working with the
 * new screens, without anyone re-uploading documents.
 *
 * Fixes (only with --apply):
 *   - Signature card fronts filed under a person number that does not exist on the account
 *     (the old "second signature card" bug) are moved to Person 1, where the shared joint
 *     signature card is shown. The image file itself is not touched.
 *
 * Reports only (needs a staff decision, done in Edit Info — no re-upload):
 *   - joint accounts with no joint type, or no signing rule / trustee type ("Not set")
 *   - Joint Trustee ITF accounts whose holders have no Trustee / In-Trust-For role
 *   - regular joint / For the Account Of holders with no Risk Profiling on file
 *
 * See JOINT_ACCOUNT_GUIDE.md.
 */
class RepairJointAccountData extends Command
{
    protected $signature = 'sigcard:repair-joint-data
                            {--apply : Make the fixes (without this it only shows what would change)}';

    protected $description = 'Check old joint accounts against the new joint account structure and fix hidden signature cards';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');

        $this->info($apply ? 'Repairing joint account data…' : 'Preview only (run with --apply to make the fixes)…');
        $this->newLine();

        $joints = Customer::query()
            ->where('account_type', 'Joint')
            ->with(['holders:id,customer_id,person_index,role,firstname,lastname', 'documents:id,customer_id,document_type,person_index'])
            ->orderBy('id')
            ->get();

        $misfiled = [];
        $noSubType = [];
        $noArrangement = [];
        $trusteeRolesMissing = [];
        $missingRiskProfiling = [];

        foreach ($joints as $customer) {
            $label = "#{$customer->id} {$customer->full_name}";
            $highestPerson = max(1, (int) $customer->holders->max('person_index'));

            foreach ($customer->documents as $document) {
                if ($document->document_type === 'sigcard_front' && $document->person_index > $highestPerson) {
                    $misfiled[] = [$customer->id, $customer->full_name, $document->id, $document->person_index];
                }
            }

            if (! $customer->joint_sub_type) {
                $noSubType[] = $label;

                continue;
            }

            if (! $customer->joint_arrangement) {
                $noArrangement[] = $label.' ('.$customer->joint_sub_type.')';
            }

            if ($customer->joint_sub_type === 'ITF'
                && $customer->joint_arrangement === 'Joint Trustee'
                && $customer->holders->whereNull('role')->isNotEmpty()) {
                $trusteeRolesMissing[] = $label;
            }

            if (in_array($customer->joint_sub_type, ['Non-ITF', 'FAO'], true)) {
                $people = collect([1])->merge($customer->holders->pluck('person_index'));
                $backs = $customer->documents->where('document_type', 'sigcard_back')->pluck('person_index');
                $without = $people->diff($backs);
                if ($without->isNotEmpty()) {
                    $missingRiskProfiling[] = $label.' — person '.$without->implode(', ');
                }
            }
        }

        $this->line('<options=bold>1. Signature cards hidden because they are filed under a person who does not exist</>');
        if ($misfiled === []) {
            $this->line('   None found.');
        } else {
            $this->table(['Customer', 'Name', 'Document', 'Filed under person'], $misfiled);

            if ($apply) {
                DB::transaction(function () use ($misfiled) {
                    foreach ($misfiled as [$customerId, , $documentId, $oldPerson]) {
                        $document = CustomerDocument::find($documentId);
                        $document->update(['person_index' => 1]);

                        activity()
                            ->performedOn(Customer::find($customerId))
                            ->withProperties([
                                'action' => 'joint_signature_card_refiled',
                                'document_id' => $documentId,
                                'from_person_index' => $oldPerson,
                                'to_person_index' => 1,
                            ])
                            ->log('Joint signature card moved to Person 1 by data repair (no re-upload)');
                    }
                });
                $this->info('   Fixed: '.count($misfiled).' signature card(s) moved to Person 1.');
            } else {
                $this->warn('   Would move '.count($misfiled).' signature card(s) to Person 1.');
            }
        }

        $this->reportList('2. Joint accounts with no joint type (Regular Joint / ITF / For the Account Of)', $noSubType,
            'Shown as plain "Joint". Joint type cannot be changed in Edit Info yet; ask IT if these need one.');
        $this->reportList('3. Joint accounts with signing rule / trustee type "Not set"', $noArrangement,
            'Staff: open the customer → Edit Info → choose All Must Sign / Any May Sign (or Sole / Joint Trustee).');
        $this->reportList('4. Joint Trustee ITF accounts with holders that have no Trustee / In-Trust-For role', $trusteeRolesMissing,
            'They show as In-Trust-For. Staff: Edit Info → mark the second trustee.');
        $this->reportList('5. Joint holders with no Risk Profiling on file', $missingRiskProfiling,
            'Only needed if the bank requires it for older accounts. Upload just the missing Risk Profiling in Edit Docs.');

        $this->newLine();
        $this->line("Checked {$joints->count()} joint account(s). No images were moved, renamed or deleted.");

        return self::SUCCESS;
    }

    /**
     * @param  array<int, string>  $items
     */
    private function reportList(string $title, array $items, string $whatToDo): void
    {
        $this->newLine();
        $this->line("<options=bold>{$title}</>");

        if ($items === []) {
            $this->line('   None found.');

            return;
        }

        foreach ($items as $item) {
            $this->line("   - {$item}");
        }
        $this->line("   → {$whatToDo}");
    }
}
