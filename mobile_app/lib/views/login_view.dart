import 'package:flutter/material.dart';
import '../config/constants.dart';
import '../services/api_service.dart';
import 'dashboard_view.dart';

class LoginView extends StatefulWidget {
  const LoginView({Key? key}) : super(key: key);

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  final _formKey = GlobalKey<FormState>();
  final _empIdController = TextEditingController();
  final _passwordController = TextEditingController();
  final _serverUrlController = TextEditingController();
  
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _showServerConfig = false;

  @override
  void initState() {
    super.initState();
    _loadServerUrl();
  }

  Future<void> _loadServerUrl() async {
    final url = await ApiService.getBaseUrl();
    _serverUrlController.text = url;
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      if (_showServerConfig && _serverUrlController.text.isNotEmpty) {
        await ApiService.setBaseUrl(_serverUrlController.text.trim());
      }

      final user = await ApiService.login(
        _empIdController.text.trim(),
        _passwordController.text.trim(),
      );

      if (mounted && user != null) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => DashboardView(user: user)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: AppConstants.dangerRed,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundLight,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Sankara Header Icon & Badge
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: AppConstants.primaryOrangeLight,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppConstants.primaryOrange, width: 2),
                    ),
                    child: const Icon(
                      Icons.remove_red_eye_outlined,
                      size: 38,
                      color: AppConstants.primaryOrange,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // App Title & Tagline
                  const Text(
                    "Netrartha v1",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: AppConstants.navyDark,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    AppConstants.tagline,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppConstants.primaryOrange,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    AppConstants.sankaraAnniversary,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: AppConstants.textMuted,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Login Form Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppConstants.borderLight),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Staff Sign In",
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppConstants.navyDark,
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Employee ID Input
                        TextFormField(
                          controller: _empIdController,
                          keyboardType: TextInputType.text,
                          decoration: InputDecoration(
                            labelText: "Employee ID",
                            hintText: "e.g. 006704 or 000338",
                            prefixIcon: const Icon(Icons.badge_outlined, color: AppConstants.primaryOrange),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppConstants.primaryOrange, width: 2),
                            ),
                          ),
                          validator: (val) => val == null || val.isEmpty ? "Please enter Employee ID" : null,
                        ),
                        const SizedBox(height: 16),

                        // Password Input
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          decoration: InputDecoration(
                            labelText: "Password",
                            hintText: "Enter password",
                            prefixIcon: const Icon(Icons.lock_outline, color: AppConstants.primaryOrange),
                            suffixIcon: IconButton(
                              icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppConstants.primaryOrange, width: 2),
                            ),
                          ),
                          validator: (val) => val == null || val.isEmpty ? "Please enter Password" : null,
                        ),
                        const SizedBox(height: 20),

                        // Login Button
                        ElevatedButton(
                          onPressed: _isLoading ? null : _handleLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppConstants.primaryOrange,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 50),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 2,
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : const Text(
                                  "SIGN IN TO NETRARTHA",
                                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                                ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Toggle Server Config Button
                  TextButton.icon(
                    onPressed: () => setState(() => _showServerConfig = !_showServerConfig),
                    icon: const Icon(Icons.settings, size: 16, color: AppConstants.textMuted),
                    label: Text(
                      _showServerConfig ? "Hide Server URL Config" : "Configure API Server URL",
                      style: const TextStyle(fontSize: 12, color: AppConstants.textMuted, fontWeight: FontWeight.w600),
                    ),
                  ),

                  if (_showServerConfig) ...[
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _serverUrlController,
                      decoration: InputDecoration(
                        labelText: "API Server URL",
                        hintText: "http://<SERVER_IP>:5000/api",
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
