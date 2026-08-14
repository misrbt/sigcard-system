<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\BSPRolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RequireTwoFactorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(BSPRolesAndPermissionsSeeder::class);
    }

    public function test_admin_can_exempt_and_reinstate_2fa_requirement_for_a_user(): void
    {
        $admin = User::where('email', 'admin@sigcard.com')->first();
        $target = User::where('email', 'areyes@sigcard.com')->first();

        $this->assertTrue($target->require_two_factor);

        Sanctum::actingAs($admin, ['*']);

        $this->postJson("/api/admin/users/{$target->id}/require-2fa/disable")
            ->assertOk()
            ->assertJsonPath('data.require_two_factor', false);

        $target->refresh();
        $this->assertFalse($target->require_two_factor);
        $this->assertNotNull($target->recovery_code_hash);

        $this->postJson("/api/admin/users/{$target->id}/require-2fa")
            ->assertOk()
            ->assertJsonPath('data.require_two_factor', true);

        $target->refresh();
        $this->assertTrue($target->require_two_factor);
        $this->assertNull($target->recovery_code_hash);
    }

    public function test_non_admin_cannot_change_2fa_requirement(): void
    {
        $user = User::where('email', 'areyes@sigcard.com')->first();

        Sanctum::actingAs($user, ['*']);

        $this->postJson("/api/admin/users/{$user->id}/require-2fa/disable")
            ->assertForbidden();
    }

    public function test_exempted_user_logs_in_with_recovery_code_instead_of_authenticator(): void
    {
        $admin = User::where('email', 'admin@sigcard.com')->first();
        $target = User::where('email', 'areyes@sigcard.com')->first();
        $target->update(['password' => bcrypt('Password123!')]);

        Sanctum::actingAs($admin, ['*']);
        $this->postJson("/api/admin/users/{$target->id}/require-2fa/disable")->assertOk();

        $loginPayload = [
            'email' => $target->email,
            'password' => 'Password123!',
            'device_id' => 'test-device-1',
        ];

        // First login attempt after being exempted: the code is revealed once.
        $issued = $this->postJson('/api/auth/login', $loginPayload)
            ->assertOk()
            ->assertJsonPath('data.status', 'recovery_code_issued')
            ->json('data');

        $this->assertNotEmpty($issued['recovery_code']);
        $this->assertNotEmpty($issued['temporary_token']);

        $this->postJson('/api/auth/confirm-recovery-code', ['temporary_token' => $issued['temporary_token']])
            ->assertOk()
            ->assertJsonPath('data.status', 'authenticated');

        // Second login: code was already shown, so it must now be entered.
        $required = $this->postJson('/api/auth/login', $loginPayload)
            ->assertOk()
            ->assertJsonPath('data.status', 'recovery_code_required')
            ->json('data');

        $this->postJson('/api/auth/verify-recovery-code', [
            'temporary_token' => $required['temporary_token'],
            'recovery_code' => 'WRONG-CODE-0000',
        ])->assertStatus(422);

        $this->postJson('/api/auth/verify-recovery-code', [
            'temporary_token' => $required['temporary_token'],
            'recovery_code' => $issued['recovery_code'],
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'authenticated');
    }
}
