import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config/constants.dart';
import '../models/user_model.dart';
import '../models/patient_model.dart';
import '../services/api_service.dart';
import '../services/database_helper.dart';

class PatientListView extends StatefulWidget {
  final UserModel user;

  const PatientListView({Key? key, required this.user}) : super(key: key);

  @override
  State<PatientListView> createState() => _PatientListViewState();
}

class _PatientListViewState extends State<PatientListView> {
  List<PatientModel> _patients = [];
  List<PatientModel> _unsyncedPatients = [];
  bool _isLoading = true;
  String _searchQuery = "";

  @override
  void initState() {
    super.initState();
    _fetchPatients();
  }

  Future<void> _fetchPatients() async {
    setState(() => _isLoading = true);

    // Fetch local SQLite unsynced patients
    final unsynced = await DatabaseHelper.instance.getUnsyncedPatients();

    try {
      final baseUrl = await ApiService.getBaseUrl();
      final token = await ApiService.getToken();
      final response = await http.get(
        Uri.parse('$baseUrl/patients'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List data = jsonDecode(response.body);
        final remotePatients = data.map((json) => PatientModel.fromJson(json)).toList();

        if (mounted) {
          setState(() {
            _unsyncedPatients = unsynced;
            _patients = [...unsynced, ...remotePatients];
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _unsyncedPatients = unsynced;
          _patients = unsynced;
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _patients.where((p) {
      final query = _searchQuery.toLowerCase();
      return p.name.toLowerCase().contains(query) ||
          p.uniqueId.toLowerCase().contains(query) ||
          p.phone.contains(query) ||
          p.screeningPlaceCode.toLowerCase().contains(query);
    }).toList();

    return Scaffold(
      backgroundColor: AppConstants.backgroundLight,
      appBar: AppBar(
        backgroundColor: AppConstants.navyDark,
        title: const Text("Patient Records Directory", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: TextField(
              onChanged: (val) => setState(() => _searchQuery = val),
              decoration: InputDecoration(
                hintText: "Search by patient name, unique ID, phone...",
                prefixIcon: const Icon(Icons.search, color: AppConstants.primaryOrange),
                fillColor: Colors.white,
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? const Center(child: Text("No patient records found."))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final p = filtered[index];
                          final isPositiveDr = p.drStatus != "No DR" && p.drStatus != "Ungradable";

                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        p.name,
                                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppConstants.navyDark),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: isPositiveDr ? AppConstants.dangerRed.withValues(alpha: 0.1) : Colors.green.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          p.drStatus,
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: isPositiveDr ? AppConstants.dangerRed : Colors.green,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    "ID: ${p.uniqueId} • Date: ${p.date}",
                                    style: const TextStyle(fontSize: 11, color: AppConstants.textMuted),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Text("${p.age} yrs • ${p.gender} • 📞 ${p.phone}", style: const TextStyle(fontSize: 12)),
                                      const Spacer(),
                                      if (!p.isSynced)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppConstants.warningAmber,
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: const Text("OFFLINE", style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white)),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
