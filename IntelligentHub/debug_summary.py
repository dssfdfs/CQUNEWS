# debug_summary.py - 调试摘要生成
import sys
sys.path.insert(0, '.')

from app.services.ai_service import generate_summary_with_style, TRANSFORMERS_AVAILABLE, _model_loaded

test_content = """湖南省生态环境厅官网更新显示，廖良辉已任厅党组书记。

此前，湖南省委组织部发布公示，其中湘西州委副书记廖良辉拟进一步使用。廖良辉，男，汉族，1975年10月生，湖南岳阳人，曾任湖南省委组织部干部五处处长，2017年起任湘西州委常委、组织部部长，2018年12月明确为正厅级。2021年4月，邓良玉任湖南省应急管理厅厅长，正厅级，并兼任省应急管理厅党委书记，2025年2月到龄卸任。

公开资料显示，邓良辉曾任湖南省纪委省监委驻省生态环境厅纪检监察组组长。
"""

test_title = "邓良辉，履新"

print("=" * 60)
print("摘要生成调试")
print("=" * 60)
print(f"transformers可用: {TRANSFORMERS_AVAILABLE}")
print(f"模型已加载: {_model_loaded}")
print()

print("正在生成摘要...")
result = generate_summary_with_style(test_content, test_title, length="medium", style="neutral")

print("\n生成的摘要:")
print(f"short: '{result['short']}'")
print(f"medium: '{result['medium']}'")
print(f"long: '{result['long']}'")

print("\n检查摘要长度:")
print(f"short长度: {len(result['short'])}")
print(f"medium长度: {len(result['medium'])}")
print(f"long长度: {len(result['long'])}")

print("\n检查摘要内容:")
print(f"short是否为空: {result['short'] == ''}")
print(f"medium是否为空: {result['medium'] == ''}")
print(f"long是否为空: {result['long'] == ''}")

print("\n" + "=" * 60)