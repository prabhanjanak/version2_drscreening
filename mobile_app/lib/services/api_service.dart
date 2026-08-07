import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';
import '../models/user_model.dart';
import '../models/patient_model.dart';
import '../models/screening_place_model.dart';
import '../models/vision_center_model.dart';
import 'database_helper.dart';

class ApiService {
  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('api_base_url');
    if (saved != null && saved.isNotEmpty) {
      if (saved.contains('10.0.2.2') || saved.contains('localhost') || saved.contains('127.0.0.1') || saved.contains('192.168.')) {
        await prefs.setString('api_base_url', AppConstants.defaultApiBaseUrl);
        return AppConstants.defaultApiBaseUrl;
      }
      return saved;
    }

    return AppConstants.defaultApiBaseUrl;
  }

  static Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('api_base_url', url);
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('jwt_token');
  }

  static Future<UserModel?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('user_data');
    if (userStr != null) {
      try {
        return UserModel.fromJson(jsonDecode(userStr));
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
    await prefs.remove('user_data');
  }

  static Future<Map<String, String>> _getHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // 1. User Login (Sends identifier, username, and empId for compatibility)
  static Future<UserModel?> login(String empId, String password) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/auth/login');

    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'identifier': empId,
        'username': empId,
        'empId': empId,
        'password': password,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final token = data['token'];
      final user = UserModel.fromJson(data['user']);

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('jwt_token', token);
      await prefs.setString('user_data', jsonEncode(user.toJson()));

      return user;
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Invalid credentials');
    }
  }

  // 2. Fetch Dashboard Metrics (with offline fallback)
  static Future<Map<String, dynamic>> fetchDashboardStats() async {
    try {
      final baseUrl = await getBaseUrl();
      final response = await http.get(
        Uri.parse('$baseUrl/dashboard/drsms'),
        headers: await _getHeaders(),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('cached_dashboard_stats', response.body);
        return data;
      }
    } catch (e) {
      print('Network offline for stats, checking cache: $e');
    }

    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString('cached_dashboard_stats');
    if (cached != null) {
      return jsonDecode(cached);
    }
    return {
      'summary': {
        'totalPatients': 0,
        'todayScreening': 0,
        'positiveDR': 0,
        'visionCenterCount': 0,
      }
    };
  }

  // 3. Fetch Screening Places (Camps) with offline cache
  static Future<List<ScreeningPlaceModel>> fetchScreeningPlaces() async {
    try {
      final baseUrl = await getBaseUrl();
      final response = await http.get(
        Uri.parse('$baseUrl/screening-places'),
        headers: await _getHeaders(),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final List data = jsonDecode(response.body);
        final places = data.map((json) => ScreeningPlaceModel.fromJson(json)).toList();
        await DatabaseHelper.instance.cacheScreeningPlaces(places);
        return places;
      }
    } catch (e) {
      print('Network offline for camps, returning cached list');
    }

    return await DatabaseHelper.instance.getCachedScreeningPlaces();
  }

  // 4. Fetch Vision Centers with offline cache
  static Future<List<VisionCenterModel>> fetchVisionCenters() async {
    try {
      final baseUrl = await getBaseUrl();
      final response = await http.get(
        Uri.parse('$baseUrl/vision-centers'),
        headers: await _getHeaders(),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final List data = jsonDecode(response.body);
        final centers = data.map((json) => VisionCenterModel.fromJson(json)).toList();
        await DatabaseHelper.instance.cacheVisionCenters(centers);
        return centers;
      }
    } catch (e) {
      print('Network offline for VCs, returning cached list');
    }

    return await DatabaseHelper.instance.getCachedVisionCenters();
  }

  // 5. Fetch VC Patient Referrals for active camp
  static Future<List<Map<String, dynamic>>> fetchVcReferrals(String campCode) async {
    try {
      final baseUrl = await getBaseUrl();
      final response = await http.get(
        Uri.parse('$baseUrl/vc-referrals?targetCampCode=$campCode'),
        headers: await _getHeaders(),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final List data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data);
      }
    } catch (e) {
      print('Offline: VC referrals fetch failed');
    }
    return [];
  }

  // 6. Upload Patient Screening Record
  static Future<bool> createPatientRecord(PatientModel patient) async {
    final baseUrl = await getBaseUrl();
    final response = await http.post(
      Uri.parse('$baseUrl/patients'),
      headers: await _getHeaders(),
      body: jsonEncode(patient.toJson()),
    ).timeout(const Duration(seconds: 8));

    return response.statusCode == 201 || response.statusCode == 200;
  }

  // ──── SCREENING PLACES / CAMPS CRUD ────

  static Future<ScreeningPlaceModel> createScreeningPlace(Map<String, dynamic> data) async {
    final baseUrl = await getBaseUrl();
    final response = await http.post(
      Uri.parse('$baseUrl/screening-places'),
      headers: await _getHeaders(),
      body: jsonEncode(data),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return ScreeningPlaceModel.fromJson(json);
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Failed to create screening camp');
    }
  }

  static Future<ScreeningPlaceModel> updateScreeningPlace(int id, Map<String, dynamic> data) async {
    final baseUrl = await getBaseUrl();
    final response = await http.put(
      Uri.parse('$baseUrl/screening-places/$id'),
      headers: await _getHeaders(),
      body: jsonEncode(data),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return ScreeningPlaceModel.fromJson(json);
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Failed to update screening camp');
    }
  }

  static Future<bool> deleteScreeningPlace(int id) async {
    final baseUrl = await getBaseUrl();
    final response = await http.delete(
      Uri.parse('$baseUrl/screening-places/$id'),
      headers: await _getHeaders(),
    );

    if (response.statusCode == 200) {
      return true;
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Failed to delete camp');
    }
  }

  // ──── SYSTEM USERS / STAFF CRUD ────

  static Future<List<UserModel>> fetchSystemUsers() async {
    final baseUrl = await getBaseUrl();
    final response = await http.get(
      Uri.parse('$baseUrl/system-users'),
      headers: await _getHeaders(),
    );

    if (response.statusCode == 200) {
      final List data = jsonDecode(response.body);
      return data.map((json) => UserModel.fromJson(json)).toList();
    } else {
      throw Exception('Failed to fetch system users');
    }
  }

  static Future<UserModel> createSystemUser(Map<String, dynamic> data) async {
    final baseUrl = await getBaseUrl();
    final response = await http.post(
      Uri.parse('$baseUrl/system-users'),
      headers: await _getHeaders(),
      body: jsonEncode(data),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return UserModel.fromJson(json);
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Failed to create user account');
    }
  }

  static Future<UserModel> updateSystemUser(int id, Map<String, dynamic> data) async {
    final baseUrl = await getBaseUrl();
    final response = await http.patch(
      Uri.parse('$baseUrl/system-users/$id'),
      headers: await _getHeaders(),
      body: jsonEncode(data),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return UserModel.fromJson(json);
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Failed to update user account');
    }
  }

  static Future<bool> deleteSystemUser(int id) async {
    final baseUrl = await getBaseUrl();
    final response = await http.delete(
      Uri.parse('$baseUrl/system-users/$id'),
      headers: await _getHeaders(),
    );

    if (response.statusCode == 200) {
      return true;
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Failed to delete user account');
    }
  }

  // ──── VISION CENTERS CRUD ────

  static Future<VisionCenterModel> createVisionCenter(Map<String, dynamic> data) async {
    final baseUrl = await getBaseUrl();
    final response = await http.post(
      Uri.parse('$baseUrl/vision-centers'),
      headers: await _getHeaders(),
      body: jsonEncode(data),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return VisionCenterModel.fromJson(json);
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Failed to create Vision Center');
    }
  }

  static Future<VisionCenterModel> updateVisionCenter(int id, Map<String, dynamic> data) async {
    final baseUrl = await getBaseUrl();
    final response = await http.put(
      Uri.parse('$baseUrl/vision-centers/$id'),
      headers: await _getHeaders(),
      body: jsonEncode(data),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return VisionCenterModel.fromJson(json);
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Failed to update Vision Center');
    }
  }

  static Future<bool> deleteVisionCenter(int id) async {
    final baseUrl = await getBaseUrl();
    final response = await http.delete(
      Uri.parse('$baseUrl/vision-centers/$id'),
      headers: await _getHeaders(),
    );

    if (response.statusCode == 200) {
      return true;
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Failed to delete Vision Center');
    }
  }
}
