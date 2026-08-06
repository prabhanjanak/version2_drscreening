import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'config/constants.dart';
import 'services/api_service.dart';
import 'views/login_view.dart';
import 'views/dashboard_view.dart';

class DevHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => true;
  }
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  HttpOverrides.global = DevHttpOverrides();
  runApp(const NetrarthaMobileApp());
}

class NetrarthaMobileApp extends StatelessWidget {
  const NetrarthaMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: AppConstants.primaryOrange,
        scaffoldBackgroundColor: AppConstants.backgroundLight,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppConstants.primaryOrange,
          primary: AppConstants.primaryOrange,
          secondary: AppConstants.navyDark,
        ),
        textTheme: GoogleFonts.interTextTheme(
          Theme.of(context).textTheme,
        ),
        appBarTheme: const AppBarTheme(
          elevation: 0,
          centerTitle: false,
          iconTheme: IconThemeData(color: Colors.white),
        ),
      ),
      home: const SessionCheckView(),
    );
  }
}

class SessionCheckView extends StatefulWidget {
  const SessionCheckView({super.key});

  @override
  State<SessionCheckView> createState() => _SessionCheckViewState();
}

class _SessionCheckViewState extends State<SessionCheckView> {
  @override
  void initState() {
    super.initState();
    _checkSavedSession();
  }

  Future<void> _checkSavedSession() async {
    final user = await ApiService.getSavedUser();
    if (mounted) {
      if (user != null) {
        // Persistent Login - Navigate directly to Dashboard without requiring re-login
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => DashboardView(user: user)),
        );
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginView()),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundLight,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: AppConstants.primaryOrangeLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.remove_red_eye_outlined, size: 36, color: AppConstants.primaryOrange),
            ),
            const SizedBox(height: 16),
            const Text(
              "Netrartha",
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppConstants.navyDark),
            ),
            const SizedBox(height: 12),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: AppConstants.primaryOrange),
            ),
          ],
        ),
      ),
    );
  }
}
