import 'package:flutter/material.dart';

class AppConstants {
  // Application Name & Branding
  static const String appName = "Netrartha";
  static const String appVersion = "v1.0.0";
  static const String tagline = "Serving Vision. Transforming Lives.";
  static const String sankaraAnniversary = "50 Years of Service (1977-2027) • 3 Million+ Free Surgeries";

  // USB development uses `adb reverse tcp:5000 tcp:5000`, which maps the
  // phone's localhost:5000 directly to the API running on the development Mac.
  // For a deployed app without USB, replace this with the hosted HTTPS API URL.
  static const String defaultApiBaseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: "http://127.0.0.1:5000/api",
  );

  // Brand Palette (Sankara Orange & Deep Navy)
  static const Color primaryOrange = Color(0xFFFF6B00);
  static const Color primaryOrangeDark = Color(0xFFD95B00);
  static const Color primaryOrangeLight = Color(0xFFFFF0E5);

  static const Color navyDark = Color(0xFF0B2545);
  static const Color navyMedium = Color(0xFF134074);

  static const Color backgroundLight = Color(0xFFF8FAFC);
  static const Color surfaceWhite = Color(0xFFFFFFFF);
  static const Color textDark = Color(0xFF0F172A);
  static const Color textMuted = Color(0xFF64748B);
  static const Color borderLight = Color(0xFFE2E8F0);

  static const Color successGreen = Color(0xFF10B981);
  static const Color dangerRed = Color(0xFFEF4444);
  static const Color warningAmber = Color(0xFFF59E0B);

  // Form Option Grids
  static const List<String> genderOptions = ["Male", "Female", "Other"];

  static const List<String> diabetesDurationOptions = [
    "No Diabetes",
    "Newly Diagnosed",
    "<1 Year",
    "1 Year",
    "2 Years",
    "3 Years",
    "4 Years",
    "5 Years",
    "10 Years",
    "15+ Years"
  ];

  static const List<String> drStatusOptions = [
    "No DR",
    "Mild NPDR",
    "Moderate NPDR",
    "Severe NPDR",
    "PDR",
    "Ungradable"
  ];

  static const List<String> adviceOptions = [
    "Annual Review",
    "Review in 6 Months",
    "Refer to Base Hospital",
    "Laser Photocoagulation",
    "Intravitreal Injection",
    "Vitreoretinal Surgery"
  ];
}
