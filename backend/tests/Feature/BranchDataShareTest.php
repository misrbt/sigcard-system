<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\BranchDataShare;
use App\Models\Customer;
use App\Models\CustomerDocument;
use App\Models\User;
use Database\Seeders\BSPRolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BranchDataShareTest extends TestCase
{
    use RefreshDatabase;

    private Branch $mainOffice;

    private Branch $surigao;

    private Branch $other;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(BSPRolesAndPermissionsSeeder::class);

        $this->mainOffice = Branch::create(['branch_name' => 'Main Office', 'brak' => 'MO', 'brcode' => '01']);
        $this->surigao = Branch::create(['branch_name' => 'Surigao BLU', 'brak' => 'SU', 'brcode' => '11', 'parent_id' => $this->mainOffice->id]);
        $this->other = Branch::create(['branch_name' => 'Jasaan Branch', 'brak' => 'JA', 'brcode' => '02']);

        BranchDataShare::create([
            'source_branch_id' => $this->surigao->id,
            'target_branch_id' => $this->mainOffice->id,
            'date_from' => '2026-06-01',
            'date_to' => '2026-09-24',
        ]);
    }

    private function makeCustomer(Branch $branch, string $dateOpened, string $lastname): Customer
    {
        return Customer::create([
            'firstname' => 'Test',
            'lastname' => $lastname,
            'account_type' => 'Regular',
            'risk_level' => 'Low Risk',
            'status' => 'active',
            'branch_id' => $branch->id,
            'account_no' => $lastname.'-001',
            'date_opened' => $dateOpened,
        ]);
    }

    private function actingAsUserOf(Branch $branch): void
    {
        $user = User::factory()->create(['branch_id' => $branch->id]);
        $user->assignRole('user');

        Sanctum::actingAs($user, ['*']);
    }

    /**
     * @return \Illuminate\Support\Collection<int, string>
     */
    private function visibleLastnames(): \Illuminate\Support\Collection
    {
        $response = $this->getJson('/api/customers?per_page=100');
        $response->assertOk();

        return collect($response->json('data'))->pluck('lastname');
    }

    public function test_main_office_user_sees_shared_customers_inside_the_date_window(): void
    {
        $this->makeCustomer($this->mainOffice, '2026-01-10', 'OwnRecord');
        $this->makeCustomer($this->surigao, '2026-06-09', 'FirstDay');
        $this->makeCustomer($this->surigao, '2026-09-24', 'LastDay');

        $this->actingAsUserOf($this->mainOffice);

        $names = $this->visibleLastnames();

        $this->assertTrue($names->contains('OwnRecord'));
        $this->assertTrue($names->contains('FirstDay'));
        $this->assertTrue($names->contains('LastDay'));
    }

    public function test_customers_outside_the_date_window_are_not_shared(): void
    {
        $this->makeCustomer($this->surigao, '2026-05-31', 'TooEarly');
        $this->makeCustomer($this->surigao, '2026-09-25', 'TooLate');

        $this->actingAsUserOf($this->mainOffice);

        $names = $this->visibleLastnames();

        $this->assertFalse($names->contains('TooEarly'));
        $this->assertFalse($names->contains('TooLate'));
    }

    public function test_other_branches_are_not_shared_with_main_office(): void
    {
        $this->makeCustomer($this->other, '2026-07-01', 'OtherBranch');

        $this->actingAsUserOf($this->mainOffice);

        $this->assertFalse($this->visibleLastnames()->contains('OtherBranch'));
    }

    public function test_sharing_is_one_way_and_does_not_reach_other_branches(): void
    {
        $this->makeCustomer($this->mainOffice, '2026-07-01', 'MainRecord');
        $this->makeCustomer($this->surigao, '2026-07-01', 'SurigaoRecord');

        $this->actingAsUserOf($this->other);
        $this->assertFalse($this->visibleLastnames()->contains('SurigaoRecord'));

        $this->actingAsUserOf($this->surigao);
        $names = $this->visibleLastnames();
        $this->assertTrue($names->contains('SurigaoRecord'));
        $this->assertFalse($names->contains('MainRecord'));
    }

    public function test_switching_off_the_rule_stops_sharing(): void
    {
        $this->makeCustomer($this->surigao, '2026-07-01', 'Shared');
        BranchDataShare::query()->update(['is_active' => false]);

        $this->actingAsUserOf($this->mainOffice);

        $this->assertFalse($this->visibleLastnames()->contains('Shared'));
    }

    public function test_shared_customers_are_marked_and_keep_their_documents(): void
    {
        $customer = $this->makeCustomer($this->surigao, '2026-07-01', 'WithImage');
        CustomerDocument::create([
            'customer_id' => $customer->id,
            'document_type' => 'signature',
            'file_path' => 'customers/test.jpg',
            'person_index' => 1,
        ]);

        $this->actingAsUserOf($this->mainOffice);

        $row = collect($this->getJson('/api/customers?per_page=100')->json('data'))
            ->firstWhere('lastname', 'WithImage');

        $this->assertTrue($row['is_shared']);
        $this->assertSame('Surigao BLU', $row['shared_from_branch']);
        $this->assertCount(1, $row['documents']);
    }

    public function test_documents_are_hidden_when_the_rule_excludes_them(): void
    {
        $customer = $this->makeCustomer($this->surigao, '2026-07-01', 'NoImage');
        CustomerDocument::create([
            'customer_id' => $customer->id,
            'document_type' => 'signature',
            'file_path' => 'customers/test.jpg',
            'person_index' => 1,
        ]);
        BranchDataShare::query()->update(['include_documents' => false]);

        $this->actingAsUserOf($this->mainOffice);

        $row = collect($this->getJson('/api/customers?per_page=100')->json('data'))
            ->firstWhere('lastname', 'NoImage');

        $this->assertNotNull($row);
        $this->assertCount(0, $row['documents']);
        $this->getJson("/api/customers/{$customer->id}/documents")->assertOk()->assertJsonCount(0);
    }

    public function test_admin_can_manage_sharing_rules(): void
    {
        $admin = User::factory()->create(['branch_id' => $this->mainOffice->id]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin, ['*']);

        $payload = [
            'source_branch_id' => $this->other->id,
            'target_branch_id' => $this->mainOffice->id,
            'date_from' => '2026-10-01',
            'date_to' => '2026-12-31',
            'include_documents' => true,
            'is_active' => true,
        ];

        $created = $this->postJson('/api/admin/branch-shares', $payload)->assertCreated();
        $id = $created->json('data.id');

        $this->putJson("/api/admin/branch-shares/{$id}", array_merge($payload, ['is_active' => false]))
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->getJson('/api/admin/branch-shares')->assertOk()->assertJsonCount(2, 'data');

        $this->deleteJson("/api/admin/branch-shares/{$id}")->assertOk();
        $this->assertDatabaseMissing('branch_data_shares', ['id' => $id]);
    }

    public function test_sharing_rule_rejects_same_branch_and_backwards_dates(): void
    {
        $admin = User::factory()->create(['branch_id' => $this->mainOffice->id]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin, ['*']);

        $this->postJson('/api/admin/branch-shares', [
            'source_branch_id' => $this->mainOffice->id,
            'target_branch_id' => $this->mainOffice->id,
            'date_from' => '2026-10-01',
            'date_to' => '2026-09-01',
        ])->assertStatus(422)->assertJsonValidationErrors(['source_branch_id', 'date_to']);
    }

    public function test_non_admin_cannot_manage_sharing_rules(): void
    {
        $this->actingAsUserOf($this->mainOffice);

        $this->getJson('/api/admin/branch-shares')->assertForbidden();
    }
}
