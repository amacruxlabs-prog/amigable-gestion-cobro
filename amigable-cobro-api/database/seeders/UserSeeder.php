<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@amigable.com'],
            [
                'name' => 'Super Administrador',
                'password' => bcrypt('password123'),
            ]
        );
        $admin->assignRole('Administrador');
    }
}
