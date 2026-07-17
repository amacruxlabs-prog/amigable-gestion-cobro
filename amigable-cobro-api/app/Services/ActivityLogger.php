<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Request;

class ActivityLogger
{
    public static function log(
        string $actionType,
        string $description,
        ?string $auditableType = null,
        ?string $auditableId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?int $businessId = null,
    ): void {
        $user = auth()->user();

        ActivityLog::create([
            'business_id' => $businessId ?? $user?->business_id,
            'user_id' => $user?->id,
            'user_email' => $user?->email,
            'action_type' => $actionType,
            'description' => $description,
            'auditable_type' => $auditableType,
            'auditable_id' => $auditableId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'created_at' => now(),
        ]);
    }
}
