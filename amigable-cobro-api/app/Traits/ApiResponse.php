<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    /**
     * Send a standard success JSON response.
     */
    protected function successResponse(mixed $data, string $message = 'Operación completada exitosamente.', int $code = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data
        ], $code);
    }

    /**
     * Send a standard error JSON response.
     */
    protected function errorResponse(string $message, string $errorCode = 'INTERNAL_ERROR', mixed $details = null, int $code = 500): JsonResponse
    {
        $response = [
            'success'    => false,
            'message'    => $message,
            'error_code' => $errorCode,
        ];

        if (!is_null($details)) {
            $response['details'] = $details;
        }

        return response()->json($response, $code);
    }
}
