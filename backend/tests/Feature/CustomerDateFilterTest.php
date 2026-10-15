<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\User;
use Database\Seeders\BranchSeeder;
use Database\Seeders\BSPRolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerDateFilterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(BranchSeeder::class);
        $this->seed(BSPRolesAndPermissionsSeeder::class);
    }

    private function makeCustomer(Branch $branch, string $dateOpened, string $createdAt, string $lastname): Customer
    {
        $customer = Customer::create([
            'firstname' => 'Test',
            'lastname' => $lastname,
            'account_type' => 'Regular',
            'risk_level' => 'Low Risk',
            'status' => 'active',
            'branch_id' => $branch->id,
            'account_no' => $lastname.'-001',
            'date_opened' => $dateOpened,
        ]);

        $customer->forceFill(['created_at' => $createdAt, 'updated_at' => $createdAt])->save();

        return $customer;
    }

    public function test_admin_can_filter_customers_by_date_opened_month(): void
    {
        $admin = User::where('email', 'admin@sigcard.com')->first();
        $branch = Branch::first();

        $this->makeCustomer($branch, '2026-09-05', '2026-01-01', 'InMonth');
        $this->makeCustomer($branch, '2026-08-20', '2026-01-01', 'OutOfMonth');

        Sanctum::actingAs($admin, ['*']);

        $response = $this->getJson('/api/customers?date_field=opened&month=2026-09');

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('lastname');
        $this->assertTrue($names->contains('InMonth'));
        $this->assertFalse($names->contains('OutOfMonth'));
    }

    public function test_admin_can_filter_customers_by_uploaded_date_range(): void
    {
        $admin = User::where('email', 'admin@sigcard.com')->first();
        $branch = Branch::first();

        $this->makeCustomer($branch, '2026-01-01', '2026-09-10', 'InRange');
        $this->makeCustomer($branch, '2026-01-01', '2026-08-10', 'OutOfRange');

        Sanctum::actingAs($admin, ['*']);

        $response = $this->getJson('/api/customers?date_field=uploaded&date_from=2026-09-01&date_to=2026-09-30');

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('lastname');
        $this->assertTrue($names->contains('InRange'));
        $this->assertFalse($names->contains('OutOfRange'));
    }

    public function test_admin_can_filter_customers_by_status_date_month(): void
    {
        $admin = User::where('email', 'admin@sigcard.com')->first();
        $branch = Branch::first();

        $becameDormantInSept = $this->makeCustomer($branch, '2026-01-01', '2026-01-01', 'DormantInSept');
        $becameDormantInSept->forceFill(['status' => 'dormant', 'status_updated_at' => '2026-09-12'])->save();

        $becameDormantInAug = $this->makeCustomer($branch, '2026-01-01', '2026-01-01', 'DormantInAug');
        $becameDormantInAug->forceFill(['status' => 'dormant', 'status_updated_at' => '2026-08-12'])->save();

        Sanctum::actingAs($admin, ['*']);

        $response = $this->getJson('/api/customers?status=dormant&date_field=status&month=2026-09');

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('lastname');
        $this->assertTrue($names->contains('DormantInSept'));
        $this->assertFalse($names->contains('DormantInAug'));
    }
}
