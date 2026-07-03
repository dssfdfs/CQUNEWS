# test_t5_working.py - 验证T5模型是否真的在工作
import sys
sys.path.insert(0, '.')

from app.services.ai_service import generate_summary_with_style, TRANSFORMERS_AVAILABLE, _model_loaded

test_text = """
湖南省生态环境厅官网更新显示，廖良辉已任厅党组书记。此前，湖南省委组织部发布公示，
其中湘西州委副书记廖良辉拟进一步使用。廖良辉，男，汉族，1975年10月生，湖南岳阳人，
曾任湖南省委组织部干部五处处长，2017年起任湘西州委常委、组织部部长，2018年12月明确为正厅级。
"""

print("=" * 60)
print("T5模型工作状态测试")
print("=" * 60)
print(f"transformers可用: {TRANSFORMERS_AVAILABLE}")
print(f"模型已加载: {_model_loaded}")
print()

if TRANSFORMERS_AVAILABLE:
    print("正在生成摘要（这将触发模型加载）...")
    result = generate_summary_with_style(test_text, length="medium", style="neutral")

    print("\n生成的摘要:")
    print(f"短摘要: {result['short']}")
    print(f"中摘要: {result['medium']}")
    print(f"长摘要: {result['long']}")

    # 检查摘要质量
    print("\n摘要质量分析:")
    if "廖良辉" in result['medium']:
        print("✅ 摘要包含关键人物信息")
    else:
        print("❌ 摘要缺少关键人物信息")

    if "党组书记" in result['medium']:
        print("✅ 摘要包含关键职位信息")
    else:
        print("❌ 摘要缺少关键职位信息")

    if len(result['medium']) > 0 and len(result['medium']) <= 150:
        print("✅ 摘要长度合理")
    else:
        print("❌ 摘要长度异常")

    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)
else:
    print("transformers库未安装，无法使用T5模型")