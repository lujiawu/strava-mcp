import { z } from "zod";
import { updateActivity as updateActivityInStrava, StravaDetailedActivity } from "../stravaClient.js";

// Zod schema for input validation
const UpdateActivityInputSchema = z.object({
    activityId: z.number().int().positive().describe("The unique identifier of the activity to update."),
    name: z.string().optional().describe("The updated name of the activity."),
    type: z.string().optional().describe("The updated type of the activity ('Run', 'Ride', etc.)."),
    sportType: z.string().optional().describe("The updated sport type of the activity ('running', 'cycling', etc.)."),
    description: z.string().optional().describe("The updated description of the activity."),
    private: z.boolean().optional().describe("Whether the activity should be private (true) or public (false)."),
    commute: z.boolean().optional().describe("Whether the activity is a commute (true) or not (false)."),
    gearId: z.string().nullable().optional().describe("The gear ID to associate with the activity, or null to remove gear association.")
});

type UpdateActivityInput = z.infer<typeof UpdateActivityInputSchema>;

// Helper function to format activity details
function formatActivityDetails(activity: StravaDetailedActivity): string {
    const date = new Date(activity.start_date_local).toLocaleString();
    const distance = activity.distance ? (activity.distance / 1000).toFixed(2) + ' km' : 'N/A';
    const elevation = activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) + ' m' : 'N/A';

    let details = `🏃 **${activity.name}** (ID: ${activity.id})\n`;
    details += `   - Type: ${activity.type} (${activity.sport_type})\n`;
    details += `   - Date: ${date}\n`;
    if (activity.distance !== undefined) details += `   - Distance: ${distance}\n`;
    if (activity.total_elevation_gain !== undefined) details += `   - Elevation Gain: ${elevation}\n`;
    if (activity.description) details += `   - Description: ${activity.description}\n`;
    details += `   - Private: ${activity.private ? 'Yes' : 'No'}\n`;
    details += `   - Commute: ${activity.commute ? 'Yes' : 'No'}\n`;

    return details;
}

// Tool definition
export const updateActivityTool = {
    name: "update-activity",
    description: "Updates properties of a specific activity using its ID. You can update the name, type, sport_type, description, privacy setting, commute flag, or gear_id.",
    inputSchema: UpdateActivityInputSchema,
    execute: async ({ activityId, name, type, sportType, description, private: isPrivate, commute, gearId }: UpdateActivityInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token) {
            console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
            return {
                content: [{ type: "text" as const, text: "Configuration error: Missing Strava access token." }],
                isError: true
            };
        }

        try {
            console.error(`Updating activity ID: ${activityId}...`);
            
            // Prepare update parameters
            const updateParams: {
                name?: string;
                type?: string;
                sport_type?: string;
                description?: string;
                private?: boolean;
                commute?: boolean;
                gear_id?: string | null;
            } = {};
            
            if (name !== undefined) updateParams.name = name;
            if (type !== undefined) updateParams.type = type;
            if (sportType !== undefined) updateParams.sport_type = sportType;
            if (description !== undefined) updateParams.description = description;
            if (isPrivate !== undefined) updateParams.private = isPrivate;
            if (commute !== undefined) updateParams.commute = commute;
            if (gearId !== undefined) updateParams.gear_id = gearId;

            // Call the update function in stravaClient
            const updatedActivity = await updateActivityInStrava(token, activityId, updateParams);
            const activityDetailsText = formatActivityDetails(updatedActivity);

            console.error(`Successfully updated activity: ${updatedActivity.name}`);
            return { 
                content: [
                    { type: "text" as const, text: `✅ Successfully updated activity ID ${activityId}.\n\n${activityDetailsText}` }
                ] 
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error updating activity ${activityId}: ${errorMessage}`);
            
            const userFriendlyMessage = errorMessage.includes("Record Not Found") || errorMessage.includes("404")
                ? `Activity with ID ${activityId} not found or you don't have permission to update it.`
                : `An unexpected error occurred while updating activity ID ${activityId}. Details: ${errorMessage}`;
                
            return {
                content: [{ type: "text" as const, text: `❌ ${userFriendlyMessage}` }],
                isError: true
            };
        }
    }
};