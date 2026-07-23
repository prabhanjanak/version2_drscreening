import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'database_helper.dart';
import 'api_service.dart';

class SyncService {
  static bool _isSyncing = false;
  static StreamSubscription<List<ConnectivityResult>>? _subscription;

  // Start Real-Time Network Sync Listener
  static void initAutoSyncListener(Function()? onSyncCompleted) {
    _subscription?.cancel();
    _subscription = Connectivity().onConnectivityChanged.listen((results) {
      final isOnline = results.any((r) => r != ConnectivityResult.none);
      if (isOnline) {
        print("Network reconnected! Triggering background auto-sync...");
        syncPendingPatients().then((syncedCount) {
          if (syncedCount > 0 && onSyncCompleted != null) {
            onSyncCompleted();
          }
        });
      }
    });
  }

  static void disposeListener() {
    _subscription?.cancel();
  }

  // Sync Pending Offline Patients Engine
  static Future<int> syncPendingPatients() async {
    if (_isSyncing) return 0;
    _isSyncing = true;

    int syncedCount = 0;
    try {
      final unsynced = await DatabaseHelper.instance.getUnsyncedPatients();
      if (unsynced.isEmpty) {
        _isSyncing = false;
        return 0;
      }

      for (var patient in unsynced) {
        try {
          final success = await ApiService.createPatientRecord(patient);
          if (success) {
            if (patient.id != null) {
              await DatabaseHelper.instance.deletePatient(patient.id!);
            }
            syncedCount++;
          }
        } catch (e) {
          print('Sync error for patient ${patient.uniqueId}: $e');
        }
      }
    } catch (e) {
      print('Overall sync error: $e');
    } finally {
      _isSyncing = false;
    }

    return syncedCount;
  }
}
