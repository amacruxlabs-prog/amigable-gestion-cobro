<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

abstract class Controller
{
    use \App\Traits\ApiResponse;

    protected function getBusinessFromUuid(Request $request): object
    {
        $validated = $request->validate([
            'business_uuid' => 'required|string|exists:businesses,uuid',
        ]);

        $business = DB::table('businesses')->where('uuid', $validated['business_uuid'])->first();

        if (!$business) {
            abort(404, 'Business not found');
        }

        return $business;
    }
}
