import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:path/path.dart';
import '../models/patient_model.dart';
import '../models/screening_place_model.dart';
import '../models/vision_center_model.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database?> get database async {
    if (kIsWeb) return null; // Web uses SharedPreferences fallback
    if (_database != null) return _database!;
    _database = await _initDB('netrartha_v1_offline.db');
    return _database;
  }

  Future<Database> _initDB(String filePath) async {
    if (!kIsWeb && (defaultTargetPlatform == TargetPlatform.windows || defaultTargetPlatform == TargetPlatform.linux || defaultTargetPlatform == TargetPlatform.macOS)) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }

    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE offline_patients (
        local_id INTEGER PRIMARY KEY AUTOINCREMENT,
        uniqueId TEXT NOT NULL,
        date TEXT NOT NULL,
        screeningPlaceCode TEXT NOT NULL,
        serialNumber INTEGER NOT NULL,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        address TEXT,
        phone TEXT NOT NULL,
        diabetesDuration TEXT NOT NULL,
        bloodPressure TEXT,
        drStatus TEXT NOT NULL,
        advice TEXT NOT NULL,
        imagePath TEXT NOT NULL,
        imageQuality TEXT NOT NULL,
        referralStatus TEXT NOT NULL,
        referToBaseHospital INTEGER NOT NULL,
        isSynced INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      )
    ''');
  }

  // ──── PATIENT SCREENING OFFLINE QUEUE ────

  // Insert Patient (Universal: SQLite on mobile, SharedPreferences on Web)
  Future<int> insertPatient(PatientModel patient) async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      final List<String> list = prefs.getStringList('web_offline_patients') ?? [];
      final Map<String, dynamic> map = patient.toJson();
      map['local_id'] = DateTime.now().millisecondsSinceEpoch;
      map['isSynced'] = 0;
      map['createdAt'] = DateTime.now().toIso8601String();

      list.add(jsonEncode(map));
      await prefs.setStringList('web_offline_patients', list);
      return map['local_id'];
    } else {
      final db = await database;
      if (db == null) return 0;
      final map = patient.toJson();
      map['isSynced'] = 0;
      map['createdAt'] = DateTime.now().toIso8601String();
      return await db.insert('offline_patients', map);
    }
  }

  // Get Unsynced Patients
  Future<List<PatientModel>> getUnsyncedPatients() async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      final List<String> list = prefs.getStringList('web_offline_patients') ?? [];
      List<PatientModel> result = [];
      for (var item in list) {
        final map = jsonDecode(item);
        if (map['isSynced'] == 0 || map['isSynced'] == false) {
          result.add(PatientModel.fromJson(map));
        }
      }
      return result;
    } else {
      final db = await database;
      if (db == null) return [];
      final maps = await db.query(
        'offline_patients',
        where: 'isSynced = ?',
        whereArgs: [0],
        orderBy: 'local_id ASC',
      );
      return maps.map((map) => PatientModel.fromJson(map)).toList();
    }
  }

  // Delete Patient After Successful Sync
  Future<void> deletePatient(int localId) async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      final List<String> list = prefs.getStringList('web_offline_patients') ?? [];
      list.removeWhere((item) {
        final map = jsonDecode(item);
        return map['local_id'] == localId || map['id'] == localId;
      });
      await prefs.setStringList('web_offline_patients', list);
    } else {
      final db = await database;
      if (db != null) {
        await db.delete('offline_patients', where: 'local_id = ?', whereArgs: [localId]);
      }
    }
  }

  // Unsynced Count
  Future<int> getUnsyncedCount() async {
    final unsynced = await getUnsyncedPatients();
    return unsynced.length;
  }

  // ──── CAMPS & VISION CENTERS OFFLINE CACHE ────

  Future<void> cacheScreeningPlaces(List<ScreeningPlaceModel> places) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonList = places.map((p) => jsonEncode(p.toJson())).toList();
    await prefs.setStringList('cached_screening_places', jsonList);
  }

  Future<List<ScreeningPlaceModel>> getCachedScreeningPlaces() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonList = prefs.getStringList('cached_screening_places') ?? [];
    return jsonList.map((str) => ScreeningPlaceModel.fromJson(jsonDecode(str))).toList();
  }

  Future<void> cacheVisionCenters(List<VisionCenterModel> centers) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonList = centers.map((c) => jsonEncode(c.toJson())).toList();
    await prefs.setStringList('cached_vision_centers', jsonList);
  }

  Future<List<VisionCenterModel>> getCachedVisionCenters() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonList = prefs.getStringList('cached_vision_centers') ?? [];
    return jsonList.map((str) => VisionCenterModel.fromJson(jsonDecode(str))).toList();
  }
}
