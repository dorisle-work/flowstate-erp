<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $branches = Branch::query()->whereIn('code', ['HN', 'HCM', 'DN'])->get()->keyBy('code');

        foreach ($this->rows() as $row) {
            Customer::query()->updateOrCreate(
                ['code' => $row['code']],
                [
                    'name' => $row['name'],
                    'phone' => $row['phone'],
                    'branch_id' => $branches[$row['branch']]->id,
                ],
            );
        }
    }

    /**
     * @return list<array{code: string, name: string, phone: string, branch: string}>
     */
    private function rows(): array
    {
        return [
            ['code' => 'KH-001', 'name' => 'Công ty TNHH Bắc Việt', 'phone' => '024 3826 1101', 'branch' => 'HN'],
            ['code' => 'KH-002', 'name' => 'Nhà thuốc An Khang', 'phone' => '024 3718 2204', 'branch' => 'HN'],
            ['code' => 'KH-003', 'name' => 'Xưởng gỗ Minh Phát', 'phone' => '024 3856 4412', 'branch' => 'HN'],
            ['code' => 'KH-004', 'name' => 'Siêu thị Mini Hà Thành', 'phone' => '024 3733 9088', 'branch' => 'HN'],
            ['code' => 'KH-005', 'name' => 'Công ty CP Mekong Foods', 'phone' => '024 3944 2210', 'branch' => 'HN'],
            ['code' => 'KH-006', 'name' => 'Điện máy Phú Mỹ', 'phone' => '024 3862 7741', 'branch' => 'HN'],
            ['code' => 'KH-007', 'name' => 'Cửa hàng gạo Ngọc Hà', 'phone' => '024 3728 5519', 'branch' => 'HN'],
            ['code' => 'KH-008', 'name' => 'Quán cà phê Đinh Lễ', 'phone' => '024 3825 6630', 'branch' => 'HN'],
            ['code' => 'KH-009', 'name' => 'Trường mầm non Hoa Sen', 'phone' => '024 3755 1180', 'branch' => 'HN'],
            ['code' => 'KH-010', 'name' => 'Văn phòng phẩm Thành Công', 'phone' => '024 3861 2294', 'branch' => 'HN'],
            ['code' => 'KH-011', 'name' => 'Nhà hàng Sông Hương', 'phone' => '028 3822 4415', 'branch' => 'HCM'],
            ['code' => 'KH-012', 'name' => 'Đại lý Bình Tân', 'phone' => '028 3754 8821', 'branch' => 'HCM'],
            ['code' => 'KH-013', 'name' => 'Tiệm bánh Hòa Hưng', 'phone' => '028 3844 1106', 'branch' => 'HCM'],
            ['code' => 'KH-014', 'name' => 'Kho mát Thủ Đức', 'phone' => '028 3896 3302', 'branch' => 'HCM'],
            ['code' => 'KH-015', 'name' => 'Siêu thị Quận 7', 'phone' => '028 3771 5590', 'branch' => 'HCM'],
            ['code' => 'KH-016', 'name' => 'Xưởng may Tân Bình', 'phone' => '028 3811 7743', 'branch' => 'HCM'],
            ['code' => 'KH-017', 'name' => 'Nhà hàng Mỹ Khê', 'phone' => '0236 3833 2210', 'branch' => 'DN'],
            ['code' => 'KH-018', 'name' => 'Siêu thị Liên Chiểu', 'phone' => '0236 3739 4481', 'branch' => 'DN'],
        ];
    }
}
