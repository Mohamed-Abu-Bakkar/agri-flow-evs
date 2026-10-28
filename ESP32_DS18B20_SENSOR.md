# ESP32 V1 — DS18B20 Waterproof Soil Temperature Sensor

Hardware wiring and software functions for reading soil temperature with a DS18B20 waterproof digital temperature probe on an ESP32 V1, then posting readings to AgriFlow tied to a specific seed.

## Hardware

| DS18B20 wire | ESP32 GPIO | Notes |
|---|---|---|
| Red (VCC) | 3.3V | Power |
| Black (GND) | GND | Ground |
| Yellow/White (DATA) | GPIO4 | 1-Wire data |

- Place a **4.7 kΩ pull-up resistor** between DATA (GPIO4) and 3.3V.
- Bury the waterproof probe at root depth in the field bed for the target seed.

## Required Arduino libraries

Install via Arduino Library Manager (Sketch → Include Library → Manage Libraries):

- **OneWire** by Paul Stoffregen
- **DallasTemperature** by Miles Burton
- **ArduinoJson** by Benoit Blanchon
- **WiFi** (built-in with ESP32 core)

## ESP32 functions

### 1. `setup()` — Initialize WiFi + sensor
```cpp
void setup() {
  Serial.begin(115200);

  // Connect WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  // Initialize DS18B20
  sensors.begin();
}
```

### 2. `readSoilTemperature()` — Read °C from DS18B20
```cpp
float readSoilTemperature() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  if (tempC == DEVICE_DISCONNECTED_C) {
    Serial.println("DS18B20 not found!");
    return NAN;
  }
  return tempC;
}
```

### 3. `sendToAgriFlow(seedId, userId, temperatureC, moisturePct)` — POST reading
Posts a JSON reading to the AgriFlow Convex `/ingest` endpoint, which stores it in the `sensorReadings` table linked to `seedId`.

```cpp
bool sendToAgriFlow(const char* seedId, const char* userId, float temperatureC, float moisturePct) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(CONVEX_URL);              // https://aware-jaguar-705.convex.cloud/ingest
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["seedId"] = seedId;
  doc["userId"] = userId;
  doc["soilTemperatureC"] = temperatureC;
  if (!isnan(moisturePct)) doc["soilMoisture"] = moisturePct;
  doc["timestamp"] = getIsoTimestamp();

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  http.end();

  return code == 200;
}
```

### 4. `loop()` — Read + send on an interval
```cpp
void loop() {
  float tempC = readSoilTemperature();
  if (!isnan(tempC)) {
    Serial.printf("Soil temp: %.1f C\n", tempC);
    sendToAgriFlow(SEED_ID, USER_ID, tempC, NAN);
  }
  delay(5 * 60 * 1000); // every 5 minutes
}
```

## Configuration constants (edit before flashing)

```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* CONVEX_URL    = "https://aware-jaguar-705.convex.site/ingest";
const char* USER_ID       = "REPLACE_WITH_CONVEX_USER_ID";
const char* SEED_ID       = "REPLACE_WITH_CONVEX_SEED_ID";
```

Get `USER_ID` and `SEED_ID` from the AgriFlow app after logging a seed (`/farm`). The `SEED_ID` ties every reading to that specific seed so the AI plan and SeedCard show its live soil temperature.

## What shows in the app

- **SeedCard**: `Soil XX.X°C` once a reading exists; `No sensor` until the ESP32 posts.
- **Schedule page** (`/schedule?seed=<seedId>`): live soil temperature next to the seed name, and the AI recommendation now factors in soil temperature, moisture, seed age, weather, location, soil type, and seed variety.

## Optional: soil moisture

If you add a capacitive soil moisture probe to ESP32 ADC (GPIO34), read it with `analogRead(GPIO34)`, calibrate to a dry/wet percentage, and pass it as `soilMoisture` in `sendToAgriFlow`.
