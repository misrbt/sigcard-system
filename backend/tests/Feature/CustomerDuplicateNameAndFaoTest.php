<?php

namespace Tests\Feature;

use App\Enums\JointArrangement;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\CustomerHolder;
use App\Models\User;
use Database\Seeders\BranchSeeder;
use Database\Seeders\BSPRolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerDuplicateNameAndFaoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(BranchSeeder::class);
        $this->seed(BSPRolesAndPermissionsSeeder::class);

        Sanctum::actingAs(User::where('email', 'admin@sigcard.com')->first(), ['*']);
    }

    private function makeCustomer(string $accountType, string $firstname, ?string $middlename, string $lastname): Customer
    {
        return Customer::create([
            'firstname' => $firstname,
            'middlename' => $middlename,
            'lastname' => $lastname,
            'account_type' => $accountType,
            'risk_level' => 'Low Risk',
            'status' => 'active',
            'branch_id' => Branch::first()->id,
        ]);
    }

    private function checkName(string $accountType, string $firstname, ?string $middlename, string $lastname): bool
    {
        return (bool) $this->getJson('/api/customers/check-name?'.http_build_query(array_filter([
            'firstname' => $firstname,
            'middlename' => $middlename,
            'lastname' => $lastname,
            'account_type' => $accountType,
        ])))->assertOk()->json('exists');
    }

    public function test_same_name_and_same_account_type_is_a_duplicate(): void
    {
        $this->makeCustomer('Regular', 'Juan', 'Santos', 'Dela Cruz');

        $this->assertTrue($this->checkName('Regular', 'juan', 'santos', 'dela cruz'));
    }

    public function test_same_name_under_a_different_account_type_is_not_a_duplicate(): void
    {
        $this->makeCustomer('Regular', 'Juan', 'Santos', 'Dela Cruz');

        $this->assertFalse($this->checkName('Joint', 'Juan', 'Santos', 'Dela Cruz'));
    }

    public function test_joint_holder_is_only_a_duplicate_for_joint_accounts(): void
    {
        $joint = $this->makeCustomer('Joint', 'Maria', null, 'Reyes');
        CustomerHolder::create(['customer_id' => $joint->id, 'person_index' => 2, 'firstname' => 'Pedro', 'lastname' => 'Reyes']);

        $this->assertTrue($this->checkName('Joint', 'Pedro', null, 'Reyes'));
        $this->assertFalse($this->checkName('Regular', 'Pedro', null, 'Reyes'));
    }

    public function test_different_middle_name_is_not_a_duplicate(): void
    {
        $this->makeCustomer('Regular', 'Juan', 'Santos', 'Dela Cruz');

        $this->assertFalse($this->checkName('Regular', 'Juan', 'Garcia', 'Dela Cruz'));
        $this->assertFalse($this->checkName('Regular', 'Juan', null, 'Dela Cruz'));
    }

    public function test_for_the_account_of_uses_and_or_signing_rules(): void
    {
        $this->assertSame(['AND', 'OR'], JointArrangement::valuesForSubType('FAO'));
    }

    public function test_for_the_account_of_requires_account_name_and_organization(): void
    {
        $request = new \App\Http\Requests\StoreCustomerRequest;
        $request->merge(['account_type' => 'Joint', 'joint_sub_type' => 'FAO', 'joint_arrangement' => 'AND']);

        $validator = Validator::make($request->all(), $request->rules(), $request->messages());

        $this->assertTrue($validator->errors()->has('company_name'));
        $this->assertTrue($validator->errors()->has('organization'));
        $this->assertFalse($validator->errors()->has('joint_sub_type'));
        $this->assertFalse($validator->errors()->has('joint_arrangement'));
    }

    public function test_for_the_account_of_customer_is_known_by_its_account_name(): void
    {
        $customer = Customer::create([
            'firstname' => 'Ana', 'lastname' => 'Lim', 'account_type' => 'Joint',
            'joint_sub_type' => 'FAO', 'joint_arrangement' => 'OR',
            'company_name' => 'Ana Lim FAO Talisayan Farmers Coop', 'organization' => 'Talisayan Farmers Coop',
            'risk_level' => 'Low Risk', 'status' => 'active', 'branch_id' => Branch::first()->id,
        ]);

        $this->assertSame('Ana Lim FAO Talisayan Farmers Coop', $customer->full_name);
        $this->assertSame('Talisayan Farmers Coop', $customer->fresh()->organization);
    }
}
