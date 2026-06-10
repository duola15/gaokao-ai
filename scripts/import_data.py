#!/usr/bin/env python3
"""
高考录取数据导入工具
用法：
  1. 将云南省招生考试院的录取数据整理成 CSV 格式
  2. CSV 列：学校名称,专业名称,年份,批次,最低分,平均分,最低位次,平均位次,选科类别,选科要求,招生人数,学费
  3. 运行：python scripts/import_data.py data/yunnan_data.csv
  4. 自动生成 TypeScript 种子数据文件
"""

import csv
import json
import sys
import os

# 学校代码映射（从你的 seed_data.ts 中提取）
SCHOOL_NAME_MAP = {
    "云南大学": 1,
    "昆明理工大学": 2,
    "云南师范大学": 3,
    "昆明医科大学": 4,
    "云南财经大学": 5,
    "云南民族大学": 6,
    "云南农业大学": 7,
    "西南林业大学": 8,
    "大理大学": 9,
    "曲靖师范学院": 10,
    "玉溪师范学院": 11,
    "红河学院": 12,
    "昆明学院": 13,
    "保山学院": 14,
    "昭通学院": 15,
    "普洱学院": 16,
    "文山学院": 17,
    "滇西应用技术大学": 18,
    "云南中医药大学": 19,
    "云南警官学院": 20,
}

EXISTING_SCHOOLS = {
    1: {"name": "云南大学", "city": "昆明", "type": "211", "website": "https://www.ynu.edu.cn", "desc": "云南省唯一的211/双一流高校，民族学、生态学全国顶尖"},
    2: {"name": "昆明理工大学", "city": "昆明", "type": "双一流", "website": "https://www.kust.edu.cn", "desc": "工科强校，有色金属冶金全国第一"},
    3: {"name": "云南师范大学", "city": "昆明", "type": "公办本科", "website": "https://www.ynnu.edu.cn", "desc": "省属重点师范，西南联大传承"},
    4: {"name": "昆明医科大学", "city": "昆明", "type": "公办本科", "website": "https://www.kmmc.cn", "desc": "云南省最好的医学院校"},
    5: {"name": "云南财经大学", "city": "昆明", "type": "公办本科", "website": "https://www.ynufe.edu.cn", "desc": "省属财经类重点"},
    6: {"name": "云南民族大学", "city": "昆明", "type": "公办本科", "website": "https://www.ynni.edu.cn", "desc": "国家民委与云南省共建"},
    7: {"name": "云南农业大学", "city": "昆明", "type": "公办本科", "website": "https://www.ynau.edu.cn", "desc": "普洱茶/烟草/植物保护全国知名"},
    8: {"name": "西南林业大学", "city": "昆明", "type": "公办本科", "website": "https://www.swfu.edu.cn", "desc": "林业/园林/生态学特色"},
    9: {"name": "大理大学", "city": "大理", "type": "公办本科", "website": "https://www.dali.edu.cn", "desc": "医学/药学/民族学特色"},
    10: {"name": "曲靖师范学院", "city": "曲靖", "type": "公办本科", "website": "https://www.qjnu.edu.cn", "desc": "滇东唯一本科师范院校"},
    11: {"name": "玉溪师范学院", "city": "玉溪", "type": "公办本科", "website": "https://www.yxnu.edu.cn", "desc": "省属师范院校"},
    12: {"name": "红河学院", "city": "蒙自", "type": "公办本科", "website": "https://www.uoh.edu.cn", "desc": "越南语/国际经济与贸易特色"},
    13: {"name": "昆明学院", "city": "昆明", "type": "公办本科", "website": "https://www.kmu.edu.cn", "desc": "昆明市属本科院校"},
    14: {"name": "保山学院", "city": "保山", "type": "公办本科", "website": "https://www.bsnc.cn", "desc": "珠宝鉴定/缅甸语特色"},
    15: {"name": "昭通学院", "city": "昭通", "type": "公办本科", "website": "https://www.ztu.edu.cn", "desc": "滇东北唯一本科院校"},
    16: {"name": "普洱学院", "city": "普洱", "type": "公办本科", "website": "https://www.peu.edu.cn", "desc": "茶学/咖啡学院特色"},
    17: {"name": "文山学院", "city": "文山", "type": "公办本科", "website": "https://www.wsu.edu.cn", "desc": "三七医药/民族文化特色"},
    18: {"name": "滇西应用技术大学", "city": "大理", "type": "公办本科", "website": "https://www.wyuas.edu.cn", "desc": "珠宝/傣医药/普洱茶方向"},
    19: {"name": "云南中医药大学", "city": "昆明", "type": "公办本科", "website": "https://www.ynutcm.edu.cn", "desc": "云南省唯一中医药本科院校"},
    20: {"name": "云南警官学院", "city": "昆明", "type": "公办本科", "website": "https://www.ynpc.edu.cn", "desc": "禁毒学全国闻名"},
}


def read_csv(filepath):
    """读取CSV文件，自动检测编码"""
    encodings = ['utf-8', 'utf-8-sig', 'gbk', 'gb18030', 'gb2312']
    for enc in encodings:
        try:
            with open(filepath, 'r', encoding=enc) as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                if rows:
                    print(f"✅ 成功读取 {len(rows)} 行数据（编码：{enc}）")
                    return rows
        except (UnicodeDecodeError, UnicodeError):
            continue
    raise ValueError(f"无法解析文件 {filepath}，请检查编码")


def normalize_row(row):
    """标准化一行数据"""
    result = {}
    # 学校名称
    result['school_name'] = row.get('学校名称', row.get('院校名称', '')).strip()
    # 专业名称
    result['major_name'] = row.get('专业名称', row.get('专业', '')).strip()
    # 年份
    year_str = row.get('年份', row.get('年度', '2025')).strip()
    result['year'] = int(year_str)
    # 批次
    result['batch'] = row.get('批次', '本科批').strip()
    # 最低分
    result['min_score'] = int(float(row.get('最低分', row.get('投档最低分', 0))))
    # 平均分
    result['avg_score'] = int(float(row.get('平均分', row.get('投档平均分', result['min_score'] + 5))))
    # 最低位次
    result['min_rank'] = int(float(row.get('最低位次', row.get('最低排名', row.get('投档最低位次', 0)))))
    # 平均位次
    result['avg_rank'] = int(float(row.get('平均位次', row.get('平均排名', result['min_rank'] - 500))))
    # 选科类别
    result['subject_group'] = row.get('选科类别', row.get('科类', '理工类')).strip()
    # 选科要求
    result['subject_requirements'] = row.get('选科要求', row.get('科目要求', '不限')).strip()
    # 招生人数
    result['quota'] = int(float(row.get('招生人数', row.get('计划数', 0))))
    # 学费
    result['tuition'] = int(float(row.get('学费', row.get('收费标准', 0))))
    return result


def generate_ts_data(rows):
    """生成 TypeScript admission_records 数组"""
    records = []
    new_schools = {}
    school_id_counter = len(EXISTING_SCHOOLS) + 1

    record_id = 1
    for row_data in rows:
        try:
            r = normalize_row(row_data)
        except (ValueError, KeyError) as e:
            print(f"⚠️  跳过无效行: {e}")
            continue

        # 查找学校ID
        school_id = SCHOOL_NAME_MAP.get(r['school_name'])
        if not school_id:
            # 新学校
            school_id = school_id_counter
            new_schools[school_id] = {
                "name": r['school_name'],
                "city": "未知",
                "type": "公办本科",
                "website": "",
                "desc": "",
            }
            SCHOOL_NAME_MAP[r['school_name']] = school_id
            school_id_counter += 1
            print(f"🆕 新增学校: {r['school_name']} (ID={school_id})")

        records.append(f"""  {{
    id: {record_id},
    school_id: {school_id},
    major_name: '{r['major_name']}',
    province_code: 'yunnan',
    year: {r['year']},
    batch: '{r['batch']}',
    min_score: {r['min_score']},
    avg_score: {r['avg_score']},
    min_rank: {r['min_rank']},
    avg_rank: {r['avg_rank']},
    subject_group: '{r['subject_group']}',
    subject_requirements: '{r['subject_requirements']}',
    enrollment_quota: {r['quota']},
    tuition: {r['tuition']},
  }}""")
        record_id += 1

    return records, new_schools, record_id - 1


def write_ts_file(records, new_schools, total_count, output_path):
    """生成完整的 TypeScript 种子数据文件"""
    existing_schools_lines = []
    for sid, s in EXISTING_SCHOOLS.items():
        existing_schools_lines.append(
            f"  {{ id: {sid}, name: '{s['name']}', city: '{s['city']}', province_code: 'yunnan', "
            f"school_type: '{s['type']}', website: '{s['website']}', description: '{s['desc']}' }},"
        )
    for sid, s in new_schools.items():
        existing_schools_lines.append(
            f"  {{ id: {sid}, name: '{s['name']}', city: '{s['city']}', province_code: 'yunnan', "
            f"school_type: '{s['type']}', website: '{s['website']}', description: '{s['desc']}' }},"
        )

    records_str = ',\n'.join(records)

    ts_content = f"""// 云南省近三年高考录取数据（本科批）
// 数据来源：云南省招生考试院历年公布数据
// 自动生成于 {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
// 共 {total_count} 条录取记录

import {{ School, AdmissionRecord }} from './types';

export const yunnanSchools: School[] = [
{chr(10).join(existing_schools_lines)}
];

export function getYunnanAdmissionRecords(): AdmissionRecord[] {{
  return [
{records_str}
  ];
}}

// 兼容旧导出
export const hubeiSchools = yunnanSchools;
export const getHubeiAdmissionRecords = getYunnanAdmissionRecords;
"""

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)

    print(f"\n✅ 已写入 {output_path}")
    print(f"📊 共 {len(EXISTING_SCHOOLS) + len(new_schools)} 所学校，{total_count} 条录取记录")


def main():
    if len(sys.argv) < 2:
        print("用法: python scripts/import_data.py <CSV文件路径>")
        print("示例: python scripts/import_data.py data/yunnan_data.csv")
        print("")
        print("CSV 文件格式（列名需完全匹配）：")
        print("  学校名称,专业名称,年份,批次,最低分,平均分,最低位次,平均位次,选科类别,选科要求,招生人数,学费")
        sys.exit(1)

    csv_path = sys.argv[1]
    if not os.path.exists(csv_path):
        print(f"❌ 文件不存在: {csv_path}")
        sys.exit(1)

    print(f"📖 读取文件: {csv_path}")
    rows = read_csv(csv_path)

    print("🔄 转换数据...")
    records, new_schools, total = generate_ts_data(rows)

    output_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'lib', 'seed_data.ts'
    )
    write_ts_file(records, new_schools, total, output_path)

    print("\n🎉 完成！现在可以运行 npx next build 验证。")


if __name__ == '__main__':
    main()
