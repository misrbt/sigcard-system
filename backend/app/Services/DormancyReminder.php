<?php

namespace App\Services;

use App\Models\Customer;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * Dormancy reminder: an Active / Reactivated account whose records were not updated for
 * 2 years is due for an update before it becomes dormant.
 *
 * The 2 years count from the most recent of Date Opened, Date Updated and (for reactivated
 * accounts) the Date of Reactivation. Same rule as frontend/src/utils/dormancyReminder.js.
 */
class DormancyReminder
{
    public const YEARS = 2;

    /** Branch staff who get the reminder. */
    public const ROLES = ['cashier', 'manager', 'user'];

    private const REMINDED_STATUSES = ['active', 'reactivated'];

    /**
     * Accounts of this customer (main + extra accounts) that are due for an update.
     *
     * @return list<array{account_index:int, customer_account_id:?int, account_no:?string, status:string, basis_label:string, basis_date:string, due_date:string}>
     */
    public static function dueAccounts(Customer $customer, ?CarbonInterface $today = null): array
    {
        $today ??= Carbon::today();

        $accounts = [[
            'account_index' => 1,
            'customer_account_id' => null,
            'account_no' => $customer->account_no,
            'status' => $customer->status,
            'date_opened' => $customer->date_opened,
            'date_updated' => $customer->date_updated,
            'status_date' => $customer->status_date,
        ]];
        foreach ($customer->accounts as $i => $account) {
            $accounts[] = [
                'account_index' => $i + 2,
                'customer_account_id' => $account->id,
                'account_no' => $account->account_no,
                'status' => $account->status,
                'date_opened' => $account->date_opened,
                'date_updated' => $account->date_updated,
                'status_date' => $account->status_date,
            ];
        }

        $due = [];
        foreach ($accounts as $account) {
            $reminder = self::forAccount($account, $today);
            if ($reminder) {
                $due[] = $reminder;
            }
        }

        return $due;
    }

    /**
     * Due accounts whose reminder nobody has seen yet for the current 2-year period.
     *
     * @return list<array{account_index:int, customer_account_id:?int, account_no:?string, status:string, basis_label:string, basis_date:string, due_date:string}>
     */
    public static function unseenDueAccounts(Customer $customer, ?CarbonInterface $today = null): array
    {
        $seen = $customer->dormancyAcknowledgments
            ->map(fn ($ack): string => ($ack->customer_account_id ?? 'main').'|'.$ack->basis_date->toDateString())
            ->flip();

        return array_values(array_filter(
            self::dueAccounts($customer, $today),
            fn (array $due): bool => ! $seen->has(($due['customer_account_id'] ?? 'main').'|'.$due['basis_date'])
        ));
    }

    /**
     * @param  array{account_index:int, customer_account_id:?int, account_no:?string, status:?string, date_opened:mixed, date_updated:mixed, status_date:mixed}  $account
     */
    private static function forAccount(array $account, CarbonInterface $today): ?array
    {
        if (! in_array($account['status'], self::REMINDED_STATUSES, true)) {
            return null;
        }

        $candidates = array_filter([
            'Date Opened' => self::toDate($account['date_opened']),
            'Date Updated' => self::toDate($account['date_updated']),
            'Date of Reactivation' => $account['status'] === 'reactivated' ? self::toDate($account['status_date']) : null,
        ]);
        if ($candidates === []) {
            return null;
        }

        // Count from the most recent date.
        arsort($candidates);
        $basisLabel = array_key_first($candidates);
        $basisDate = $candidates[$basisLabel];
        $dueDate = $basisDate->copy()->addYears(self::YEARS);

        if ($today->lt($dueDate)) {
            return null;
        }

        return [
            'account_index' => $account['account_index'],
            'customer_account_id' => $account['customer_account_id'],
            'account_no' => $account['account_no'],
            'status' => $account['status'],
            'basis_label' => $basisLabel,
            'basis_date' => $basisDate->toDateString(),
            'due_date' => $dueDate->toDateString(),
        ];
    }

    private static function toDate(mixed $value): ?Carbon
    {
        if (! $value) {
            return null;
        }

        return Carbon::parse($value)->startOfDay();
    }
}
