<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WhatsAppController extends Controller
{
    public function broadcast(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'audience' => 'required|array',
            'audience.*' => 'required|integer', // Transaction IDs
        ]);

        $businessId = auth()->user()->business_id;

        // In a real app we would use a Job/Queue to send WhatsApp messages
        // Emulating the response as requested in PRD
        
        $logs = [];
        foreach ($request->audience as $txId) {
            $logs[] = [
                'business_id' => $businessId,
                'transaction_id' => $txId,
                'message' => $request->message,
                'status' => 'SENT', // emulated
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // We can create a table 'whatsapp_logs' later, for now we return success
        // DB::table('whatsapp_logs')->insert($logs);

        ActivityLogger::log('broadcast', "Envió difusión WhatsApp a " . count($logs) . " destinatarios", 'whatsapp', null, null, [
            'audience_count' => count($logs),
            'message_preview' => mb_substr($request->message, 0, 200),
        ]);

        return $this->successResponse(['sent_count' => count($logs)], 'Difusión completada (Emulación)');
    }
}
