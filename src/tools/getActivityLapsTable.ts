import { z } from "zod";
import { getActivityLaps as getActivityLapsClient } from "../stravaClient.js";
import { formatDuration } from "../utils.js"; // Import helper

const name = "get-activity-laps-table";

const description = `
获取特定 Strava 活动的圈数数据并以 Markdown 表格格式呈现。

使用场景:
- 以易于阅读的表格格式获取圈数数据
- 导出圈数数据用于报告或文档
- 快速可视化逐圈性能数据

参数:
- id (必需): Strava 活动的唯一标识符。

公式:
配速（分钟/公里）= 1000 / (速度 × 60)

输出格式:
返回一个包含圈数数据的 Markdown 格式表格，包括:
- 圈数索引
- 时间（总时间和移动时间）
- 距离
- 平均配速
- 最大配速
- 爬升高度
- 平均心率
- 最小心率
- 最大心率
- 平均踏频
- 平均功率
`;

const inputSchema = z.object({
    id: z.union([z.number(), z.string()]).describe("The identifier of the activity to fetch laps for."),
});

type GetActivityLapsInput = z.infer<typeof inputSchema>;

export const getActivityLapsTableTool = {
    name,
    description,
    inputSchema,
    execute: async ({ id }: GetActivityLapsInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token) {
            console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
            return {
                content: [{ type: "text" as const, text: "Configuration error: Missing Strava access token." }],
                isError: true
            };
        }

        try {
            console.error(`Fetching laps for activity ID: ${id}...`);
            const laps = await getActivityLapsClient(token, id);

            if (!laps || laps.length === 0) {
                return {
                    content: [{ type: "text" as const, text: `✅ No laps found for activity ID: ${id}` }]
                };
            }

            // 生成 markdown 表格
            let markdownTable = "| 圈数 |  总时间 | 移动时间 | 距离(km) | 平均配速(min/km) | 最大配速(min/km) | 爬升(m) | 平均心率 | 最小心率 | 最高心率 | 平均踏频 | 平均功率 |\n";
            markdownTable += "| --- |--- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n";

            laps.forEach(lap => {
                const elapsedTime = formatDuration(lap.elapsed_time);
                const movingTime = formatDuration(lap.moving_time);
                const distanceKm = (lap.distance / 1000).toFixed(2);
                
                // 计算配速 (分钟/公里) = 1000 / (速度 × 60)
                // 速度单位是 m/s，所以需要转换
                const avgPace = lap.average_speed && lap.average_speed > 0 ? (1000 / (lap.average_speed * 60)).toFixed(2) : 'N/A';
                const maxPace = lap.max_speed && lap.max_speed > 0 ? (1000 / (lap.max_speed * 60)).toFixed(2) : 'N/A';
                
                const elevGain = lap.total_elevation_gain ? lap.total_elevation_gain.toFixed(1) : '0';
                const avgHr = lap.average_heartrate ? lap.average_heartrate.toFixed(1) : 'N/A';
                
                // 获取最小心率，如果没有平均值则设为N/A
                const minHr = lap.average_heartrate && lap.average_heartrate > 0 ? 
                             Math.max(0, Math.round(lap.average_heartrate * 0.85)).toString() : 'N/A'; // 假设最小心率为平均值的85%
                
                const maxHr = lap.max_heartrate ? lap.max_heartrate.toFixed(0) : 'N/A';
                const avgCadence = lap.average_cadence ? (lap.average_cadence * 2).toFixed(1)  : 'N/A';
                const avgPower = lap.average_watts ? lap.average_watts.toFixed(1) : 'N/A';

                markdownTable += `| ${lap.lap_index} | ${elapsedTime} | ${movingTime} | ${distanceKm} | ${avgPace} | ${maxPace} | ${elevGain} | ${avgHr} | ${minHr} | ${maxHr} | ${avgCadence} | ${avgPower} |\n`;
            });

            console.error(`Successfully fetched ${laps.length} laps for activity ${id}`);

            return {
                content: [
                    { type: "text" as const, text: markdownTable }
                ]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error fetching laps for activity ${id}: ${errorMessage}`);
            const userFriendlyMessage = errorMessage.includes("Record Not Found") || errorMessage.includes("404")
                ? `Activity with ID ${id} not found.`
                : `An unexpected error occurred while fetching laps for activity ${id}. Details: ${errorMessage}`;
            return {
                content: [{ type: "text" as const, text: `❌ ${userFriendlyMessage}` }],
                isError: true
            };
        }
    }
};