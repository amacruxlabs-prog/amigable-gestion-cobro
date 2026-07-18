<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Business extends Model
{
    protected $table = 'businesses';

    protected $fillable = [
        'uuid',
        'name',
        'owner_name',
        'whatsapp_phone',
        'status',
        'settings',
    ];
}
