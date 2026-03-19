/**
 * Zod validation schemas for OpenWeatherMap API responses
 *
 * These schemas validate the structure of responses from:
 * - Current Weather API: https://api.openweathermap.org/data/2.5/weather
 * - 5-Day/3-Hour Forecast API: https://api.openweathermap.org/data/2.5/forecast
 *
 * Reference: https://openweathermap.org/api
 */

import { z } from 'zod';

/**
 * Weather condition schema (part of the weather array in responses)
 */
const WeatherConditionSchema = z.object({
    id: z.number(),
    main: z.string(),
    description: z.string(),
    icon: z.string().optional(),
});

/**
 * Main weather data schema (temperature, pressure, humidity, etc.)
 */
const MainWeatherDataSchema = z.object({
    temp: z.number(),
    feels_like: z.number().optional(),
    temp_min: z.number().optional(),
    temp_max: z.number().optional(),
    pressure: z.number(),
    humidity: z.number().nonnegative(),
    sea_level: z.number().optional(),
    grnd_level: z.number().optional(),
    temp_kf: z.number().optional(),
});

/**
 * Wind data schema
 */
const WindDataSchema = z.object({
    speed: z.number().nonnegative(),
    deg: z.number().min(0).max(360).optional(),
    gust: z.number().optional(),
});

/**
 * Cloud data schema
 */
const CloudDataSchema = z.object({
    all: z.number().min(0).max(100),
});

/**
 * System data schema (sunrise/sunset times)
 */
const SystemDataSchema = z.object({
    type: z.number().optional(),
    id: z.number().optional(),
    country: z.string().optional(),
    sunrise: z.number().nonnegative(),
    sunset: z.number().nonnegative(),
    pod: z.string().optional(), // Part of day (d/n) - forecast only
});

/**
 * Rain data schema (optional precipitation data)
 */
const RainDataSchema = z.object({
    '1h': z.number().optional(), // Precipitation volume for last 1 hour
    '3h': z.number().optional(), // Precipitation volume for last 3 hours
});

/**
 * Snow data schema (optional snow data)
 */
const SnowDataSchema = z.object({
    '1h': z.number().optional(),
    '3h': z.number().optional(),
});

/**
 * Coordinate schema
 */
const CoordinateSchema = z.object({
    lon: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90),
});

/**
 * OpenWeatherMap Current Weather API Response Schema
 *
 * Validates responses from the /weather endpoint
 *
 * Example response structure:
 * {
 *   "coord": { "lon": 10.99, "lat": 44.34 },
 *   "weather": [{ "id": 501, "main": "Rain", "description": "moderate rain", "icon": "10d" }],
 *   "main": { "temp": 298.48, "pressure": 1015, "humidity": 64 },
 *   "wind": { "speed": 0.62, "deg": 349 },
 *   "sys": { "sunrise": 1661834187, "sunset": 1661882248 }
 * }
 */
export const OpenWeatherMapCurrentResponseSchema = z.object({
    coord: CoordinateSchema.optional(),
    weather: z.array(WeatherConditionSchema).min(1),
    base: z.string().optional(),
    main: MainWeatherDataSchema,
    visibility: z.number().nonnegative().optional(),
    wind: WindDataSchema.optional(),
    rain: RainDataSchema.optional(),
    snow: SnowDataSchema.optional(),
    clouds: CloudDataSchema.optional(),
    dt: z.number().nonnegative(),
    sys: SystemDataSchema,
    timezone: z.number().optional(),
    id: z.number().optional(),
    name: z.string().optional(),
    cod: z.number().optional(),
});

/**
 * OpenWeatherMap Forecast API Response Schema
 *
 * Validates responses from the /forecast endpoint
 *
 * Example response structure:
 * {
 *   "cod": "200",
 *   "message": 0,
 *   "cnt": 40,
 *   "list": [
 *     {
 *       "dt": 1661871600,
 *       "main": { "temp": 296.76, "pressure": 1015, "humidity": 69 },
 *       "weather": [{ "id": 500, "main": "Rain", "description": "light rain" }],
 *       "wind": { "speed": 0.62, "deg": 349 },
 *       "pop": 0.32,
 *       "dt_txt": "2022-08-30 15:00:00"
 *     }
 *   ],
 *   "city": { "id": 3163858, "name": "Zocca", "coord": { "lon": 10.99, "lat": 44.34 } }
 * }
 */
const ForecastItemSchema = z.object({
    dt: z.number().nonnegative(),
    main: MainWeatherDataSchema,
    weather: z.array(WeatherConditionSchema).min(1),
    clouds: CloudDataSchema.optional(),
    wind: WindDataSchema.optional(),
    visibility: z.number().nonnegative().optional(),
    pop: z.number().min(0).max(1).optional(), // Probability of precipitation
    rain: RainDataSchema.optional(),
    snow: SnowDataSchema.optional(),
    sys: z.object({
        pod: z.string().optional(),
    }).optional(),
    dt_txt: z.string().optional(),
});

export const OpenWeatherMapForecastResponseSchema = z.object({
    cod: z.union([z.string(), z.number()]),
    message: z.number().optional(),
    cnt: z.number().nonnegative().optional(),
    list: z.array(ForecastItemSchema).min(1),
    city: z.object({
        id: z.number(),
        name: z.string(),
        coord: CoordinateSchema,
        country: z.string().optional(),
        population: z.number().optional(),
        timezone: z.number().optional(),
        sunrise: z.number().optional(),
        sunset: z.number().optional(),
    }).optional(),
});

/**
 * Type exports for validated data
 */
export type OpenWeatherMapCurrentResponse = z.infer<typeof OpenWeatherMapCurrentResponseSchema>;
export type OpenWeatherMapForecastResponse = z.infer<typeof OpenWeatherMapForecastResponseSchema>;
