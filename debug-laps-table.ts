import { getActivityLapsTableTool } from './src/tools/getActivityLapsTable.js';

// 设置环境变量


async function testLapsTable() {
  console.log("开始测试 getActivityLapsTableTool...");
  console.log("活动ID: 17575463560");
  
  try {
    // 使用提供的活动 ID
    console.log("\n正在获取圈数数据...");
    const result = await getActivityLapsTableTool.execute({ id: 17575463560 });
    
    console.log("\n工具执行完成，结果如下:");
    console.log("=========================");
    
    if (result.isError) {
      console.log("错误:", result.content[0]?.text);
    } else {
      if (result.content && result.content.length > 0) {
        console.log("\n表格内容:");
        console.log("=========================");
        result.content.forEach((item, index) => {
          if (item.type === 'text') {
            console.log(item.text);
          }
        });
      }
    }
  } catch (error) {
    console.error("测试过程中发生错误:", error.message);
    console.error("堆栈跟踪:", error.stack);
  }
}

// 运行测试
testLapsTable();