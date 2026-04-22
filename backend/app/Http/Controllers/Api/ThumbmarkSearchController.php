<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ThumbmarkSearchRequest;
use App\Services\ThumbmarkSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class ThumbmarkSearchController extends Controller
{
    public function __construct(private readonly ThumbmarkSearchService $service) {}

    /**
     * POST /api/search/thumbmark
     *
     * Accepts a thumbmark image upload and returns matching customer records
     * ranked by fingerprint match score.
     */
    public function search(ThumbmarkSearchRequest $request): JsonResponse
    {
        $matches = $this->service->search($request->file('thumbmark'));

        activity()
            ->causedBy(Auth::user())
            ->withProperties([
                'action' => 'thumbmark_search',
                'match_count' => count($matches),
                'had_results' => count($matches) > 0,
            ])
            ->log('Thumbmark search performed');

        return response()->json(['matches' => $matches]);
    }
}
