import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateActivityTool } from '../src/tools/updateActivity.js';
import { StravaDetailedActivity } from '../src/stravaClient.js';

// Mock the stravaClient module
vi.mock('../src/stravaClient.js', () => ({
  updateActivity: vi.fn()
}));

import { updateActivity } from '../src/stravaClient.js';

describe('updateActivityTool', () => {
  const mockToken = 'test-token';
  const mockActivity: StravaDetailedActivity = {
    id: 12345,
    resource_state: 3,
    athlete: { id: 98765, resource_state: 2 },
    name: 'Updated Test Activity',
    distance: 5000,
    moving_time: 1800,
    elapsed_time: 1900,
    total_elevation_gain: 100,
    type: 'Run',
    sport_type: 'running',
    start_date: '2024-01-01T10:00:00Z',
    start_date_local: '2024-01-01T06:00:00Z',
    timezone: 'America/Los_Angeles',
    start_latlng: [37.7749, -122.4194],
    end_latlng: [37.7749, -122.4194],
    achievement_count: 0,
    kudos_count: 0,
    comment_count: 0,
    athlete_count: 1,
    photo_count: 0,
    map: null,
    trainer: false,
    commute: false,
    manual: false,
    private: false,
    flagged: false,
    gear_id: null,
    average_speed: 2.78,
    max_speed: 4.5,
    average_cadence: 80,
    average_temp: 20,
    average_watts: 200,
    max_watts: 300,
    weighted_average_watts: 220,
    kilojoules: 360,
    device_watts: true,
    has_heartrate: true,
    average_heartrate: 140,
    max_heartrate: 170,
    calories: 400,
    description: 'Test activity description',
    gear: null,
    device_name: 'Test Device',
    perceived_exertion: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up the mocked function to return the mock activity
    (updateActivity as any).mockResolvedValue(mockActivity);
  });

  it('should update activity successfully', async () => {
    // Mock the environment variable
    process.env.STRAVA_ACCESS_TOKEN = mockToken;

    const result = await updateActivityTool.execute({
      activityId: 12345,
      name: 'Updated Name',
      description: 'Updated description',
      private: true,
      gearId: 'bike-123'
    });

    // Verify the result
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('✅ Successfully updated activity ID 12345');
    expect(result.content[0].text).toContain('Updated Test Activity');

    // Verify the updateActivity function was called with correct parameters
    expect(updateActivity).toHaveBeenCalledWith(
      mockToken,
      12345,
      {
        name: 'Updated Name',
        description: 'Updated description',
        private: true,
        gear_id: 'bike-123'
      }
    );
  });

  it('should handle missing access token', async () => {
    // Remove the environment variable
    delete process.env.STRAVA_ACCESS_TOKEN;

    const result = await updateActivityTool.execute({
      activityId: 12345,
      name: 'Updated Name'
    });

    // Verify the error result
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Configuration error: Missing Strava access token');
  });

  it('should handle API errors', async () => {
    // Mock the environment variable
    process.env.STRAVA_ACCESS_TOKEN = mockToken;

    // Mock the updateActivity function to reject with an error
    (updateActivity as any).mockRejectedValue(new Error('Record Not Found'));

    const result = await updateActivityTool.execute({
      activityId: 12345,
      name: 'Updated Name'
    });

    // Verify the error result
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Activity with ID 12345 not found');
  });

  it('should validate input parameters', () => {
    // Test that the schema properly validates inputs
    const validInputs = updateActivityTool.inputSchema.safeParse({
      activityId: 12345,
      name: 'Updated Name',
      description: 'Updated description',
      private: true,
      commute: false,
      gearId: 'shoes-456'
    });
    
    expect(validInputs.success).toBe(true);
  });

  it('should validate gearId as nullable', () => {
    // Test that the schema allows gearId to be null
    const validInputs = updateActivityTool.inputSchema.safeParse({
      activityId: 12345,
      gearId: null
    });
    
    expect(validInputs.success).toBe(true);
  });

  it('should reject invalid activity ID', () => {
    const invalidInputs = updateActivityTool.inputSchema.safeParse({
      activityId: -12345, // Invalid negative ID
      name: 'Updated Name'
    });
    
    expect(invalidInputs.success).toBe(false);
  });

  it('should handle gearId correctly including null value', async () => {
    // Mock the environment variable
    process.env.STRAVA_ACCESS_TOKEN = mockToken;

    // Test with null gearId
    await updateActivityTool.execute({
      activityId: 12345,
      gearId: null
    });

    // Verify the updateActivity function was called with gear_id as null
    expect(updateActivity).toHaveBeenCalledWith(
      mockToken,
      12345,
      {
        gear_id: null
      }
    );
  });
});