<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ApiEntity;
use App\Models\ApiEntityToken;
use Illuminate\Support\Str;

class ApiEntityController extends Controller
{
    public function index(Request $request)
    {
        $entities = ApiEntity::with('tokens')->get();
        
        return response()->json([
            'success' => true,
            'data' => $entities
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $entity = ApiEntity::create([
            'name' => $request->name,
            'description' => $request->description,
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Entidad creada exitosamente',
            'data' => $entity
        ]);
    }

    public function update(Request $request, $id)
    {
        $entity = ApiEntity::findOrFail($id);
        
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $entity->update($request->only(['name', 'description', 'is_active']));

        return response()->json([
            'success' => true,
            'message' => 'Entidad actualizada',
            'data' => $entity
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $entity = ApiEntity::findOrFail($id);
        $entity->delete();

        return response()->json([
            'success' => true,
            'message' => 'Entidad eliminada'
        ]);
    }

    public function storeToken(Request $request, $id)
    {
        $entity = ApiEntity::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'abilities' => 'nullable|array',
            'expires_at' => 'nullable|date',
        ]);

        $rawToken = bin2hex(random_bytes(32));

        $token = $entity->tokens()->create([
            'name' => $request->name,
            'token' => $rawToken,
            'abilities' => $request->abilities ?? ['*'],
            'expires_at' => $request->expires_at,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Token generado exitosamente.',
            'data' => $token
        ]);
    }

    public function revokeToken(Request $request, $id, $tokenId)
    {
        $entity = ApiEntity::findOrFail($id);
        
        $token = $entity->tokens()->findOrFail($tokenId);
        $token->delete();

        return response()->json([
            'success' => true,
            'message' => 'Token revocado'
        ]);
    }
}
