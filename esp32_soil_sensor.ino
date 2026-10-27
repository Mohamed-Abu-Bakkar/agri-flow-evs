// AgriFlow ESP32 - Soil Temperature Sensor -> Convex
//
// Sends soil temperature (and optional moisture) readings to the AgriFlow
// Convex backend, associated with a particular seed so the AI plan can be
// generated per seed.
//
// Hardware:
//   - ESP32 (V1)
//   - DS18B20 waterproof soil temperature sensor (1-Wire, GPIO4)
//   - Optional capacitive soil moisture sensor (ADC, GPIO34)
//   - WiFi credentials
//
// Libraries (Arduino Library Manager):
//   - ArduinoJson by Benoit Blanchon
//   - OneWire by Paul Stoffregen
//   - DallasTemperature by Miles Burton

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ---- WiFi ----
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ---- Convex endpoint ----
// Deployed Convex dev/prod deployment. The /ingest route is defined in
// convex/http.ts and forwards to sensorReadings.ingestHttp.
const char* CONVEX_URL = "https://aware-jaguar-705.convex.cloud/ingest";

// ---- IDs ----
// Replace these with the actual Convex document ids from your app.
// userId: from the users table (ensure mutation)
// seedId: from the seeds table (after logging a seed in the app)
const char* USER_ID   = "REPLACE_WITH_USER_ID";
const char* SEED_ID   = "REPLACE_WITH_SEED_ID";

// ---- Sensors ----
#define ONE_WIRE_BUS 4          // DS18B20 data pin
#define MOISTURE_PIN 34         // Analog moisture sensor (optional)

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

void setup() {
  Serial.begin(115200);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  sensors.begin();
}

void loop() {
  // Read soil temperature
  sensors.requestTemperatures();
  float soilTempC = sensors.getTempCByIndex(0);

  // Read optional moisture (0-4095 on ESP32 ADC)
  int moistureRaw = analogRead(MOISTURE_PIN);
  float moisturePct = 0;
  bool hasMoisture = false;
  if (moistureRaw > 0) {
    // Calibrate these two values to your probe in dry/wet soil
    const int dry = 3400;
    const int wet = 1500;
    moisturePct = constrain((dry - moistureRaw) / float(dry - wet) * 100.0, 0, 100);
    hasMoisture = true;
  }

  if (soilTempC == DEVICE_DISCONNECTED_C) {
    Serial.println("Soil temp sensor not found!");
    delay(10000);
    return;
  }

  Serial.printf("Soil temp: %.1f C  Moisture: %.1f%%\n", soilTempC, moisturePct);

  // Send to Convex
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(CONVEX_URL);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["seedId"] = SEED_ID;
    doc["userId"] = USER_ID;
    doc["soilTemperatureC"] = soilTempC;
    if (hasMoisture) doc["soilMoisture"] = moisturePct;
    doc["timestamp"] = getIsoTimestamp();

    String body;
    serializeJson(doc, body);

    int httpCode = http.POST(body);
    if (httpCode == 200) {
      Serial.println("Reading sent to Convex OK");
    } else {
      Serial.printf("Convex POST failed: %d\n", httpCode);
    }
    http.end();
  }

  // Send a reading every 5 minutes
  delay(5 * 60 * 1000);
}

// Best-effort ISO-8601 timestamp (no RTC/NTP). Convex defaults to now if omitted.
String getIsoTimestamp() {
  return String("2026-10-27T00:00:00Z");
}
