<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BranchDataShareRequest;
use App\Models\BranchDataShare;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

/**
 * Admin configuration of which branch's customers (and their uploaded documents)
 * are visible to another branch's users, limited to a date-opened window.
 */
class BranchDataShareController extends Controller
{
    public function index(): JsonResponse
    {
        $shares = BranchDataShare::with(['sourceBranch:id,branch_name', 'targetBranch:id,branch_name'])
            ->orderByDesc('is_active')
            ->orderBy('id')
            ->get()
            ->map(fn (BranchDataShare $share) => $this->present($share));

        return response()->json(['data' => $shares]);
    }

    public function store(BranchDataShareRequest $request): JsonResponse
    {
        $share = BranchDataShare::create($request->validated() + ['created_by' => Auth::id()]);

        $this->logChange('branch_data_share_created', $share);

        return response()->json([
            'message' => 'Data sharing rule created successfully.',
            'data' => $this->present($share->fresh(['sourceBranch', 'targetBranch'])),
        ], 201);
    }

    public function update(BranchDataShareRequest $request, BranchDataShare $share): JsonResponse
    {
        $share->update($request->validated());

        $this->logChange('branch_data_share_updated', $share);

        return response()->json([
            'message' => 'Data sharing rule updated successfully.',
            'data' => $this->present($share->fresh(['sourceBranch', 'targetBranch'])),
        ]);
    }

    public function destroy(BranchDataShare $share): JsonResponse
    {
        $this->logChange('branch_data_share_deleted', $share);

        $share->delete();

        return response()->json(['message' => 'Data sharing rule deleted successfully.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(BranchDataShare $share): array
    {
        return [
            'id' => $share->id,
            'source_branch_id' => $share->source_branch_id,
            'source_branch_name' => $share->sourceBranch?->branch_name,
            'target_branch_id' => $share->target_branch_id,
            'target_branch_name' => $share->targetBranch?->branch_name,
            'date_from' => $share->date_from?->toDateString(),
            'date_to' => $share->date_to?->toDateString(),
            'include_documents' => $share->include_documents,
            'is_active' => $share->is_active,
            'notes' => $share->notes,
        ];
    }

    private function logChange(string $action, BranchDataShare $share): void
    {
        activity()
            ->causedBy(Auth::user())
            ->performedOn($share)
            ->withProperties([
                'action' => $action,
                'source_branch_id' => $share->source_branch_id,
                'target_branch_id' => $share->target_branch_id,
                'date_from' => $share->date_from?->toDateString(),
                'date_to' => $share->date_to?->toDateString(),
                'include_documents' => $share->include_documents,
                'is_active' => $share->is_active,
            ])
            ->log('Branch data sharing rule changed');
    }
}
