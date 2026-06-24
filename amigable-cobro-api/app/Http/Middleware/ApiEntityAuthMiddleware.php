<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\ApiEntityToken;

class ApiEntityAuthMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $entityId = $request->header('X-Entity-ID');
        $tokenValue = $request->bearerToken() ?? $request->header('X-API-Key');

        if (!$entityId || !$tokenValue) {
            return response()->json([
                'success' => false,
                'message' => 'Faltan credenciales de acceso (X-Entity-ID y/o Authorization Bearer / X-API-Key)'
            ], 401);
        }

        $token = ApiEntityToken::with('entity')->where('api_entity_id', $entityId)->where('token', $tokenValue)->first();

        if (!$token) {
            return response()->json([
                'success' => false,
                'message' => 'Credenciales inválidas'
            ], 401);
        }

        if ($token->expires_at && $token->expires_at->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'El token ha expirado'
            ], 401);
        }

        if (!$token->entity || !$token->entity->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'La entidad está inactiva o no existe'
            ], 403);
        }

        // Update last used at asynchronously or immediately
        $token->update(['last_used_at' => now()]);

        // Add the entity to the request attributes so controllers can use it
        $request->attributes->add([
            'api_entity' => $token->entity
        ]);

        return $next($request);
    }
}
