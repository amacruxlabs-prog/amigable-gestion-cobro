<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    /**
     * Get a JWT via given credentials.
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (! $token = auth('api')->attempt($credentials)) {
            return $this->errorResponse('Credenciales inválidas.', 'UNAUTHORIZED', null, 401);
        }

        return $this->respondWithToken($token);
    }

    /**
     * Get the authenticated User.
     */
    public function me()
    {
        return $this->successResponse(auth('api')->user()->load('roles'));
    }

    /**
     * Log the user out (Invalidate the token).
     */
    public function logout()
    {
        auth('api')->logout();
        return $this->successResponse(null, 'Sesión cerrada exitosamente.');
    }

    /**
     * Refresh a token.
     */
    public function refresh()
    {
        try {
            return $this->respondWithToken(auth('api')->refresh());
        } catch (\PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException $e) {
            return $this->errorResponse('No se pudo refrescar el token: ' . $e->getMessage(), 'UNAUTHENTICATED', null, 401);
        }
    }

    /**
     * Get the token array structure.
     */
    protected function respondWithToken($token)
    {
        return $this->successResponse([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60,
            'user' => auth('api')->user()->load('roles')
        ], 'Autenticación exitosa.');
    }
}
