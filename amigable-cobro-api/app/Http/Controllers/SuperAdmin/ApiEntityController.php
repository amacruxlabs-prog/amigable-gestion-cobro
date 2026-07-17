<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogger;
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

        ActivityLogger::log('created', "Creó la entidad API {$entity->name}", 'api_entity', (string)$entity->id, null, [
            'name' => $entity->name,
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

        ActivityLogger::log('updated', "Actualizó la entidad API {$entity->name}", 'api_entity', (string)$id, null, [
            'name' => $entity->name,
            'is_active' => $entity->is_active,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Entidad actualizada',
            'data' => $entity
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $entity = ApiEntity::findOrFail($id);
        $entityName = $entity->name;
        $entity->delete();

        ActivityLogger::log('deleted', "Eliminó la entidad API {$entityName}", 'api_entity', (string)$id, [
            'name' => $entityName,
        ]);

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

        ActivityLogger::log('created', "Generó token API '{$token->name}' para entidad {$entity->name}", 'api_token', (string)$token->id, null, [
            'entity_name' => $entity->name,
            'token_name' => $token->name,
            'abilities' => $token->abilities,
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
        $tokenName = $token->name;
        $token->delete();

        ActivityLogger::log('deleted', "Revocó token API '{$tokenName}' de entidad {$entity->name}", 'api_token', (string)$tokenId, [
            'entity_name' => $entity->name,
            'token_name' => $tokenName,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Token revocado'
        ]);
    }
}
