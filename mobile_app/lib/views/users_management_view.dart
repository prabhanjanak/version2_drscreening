import 'package:flutter/material.dart';
import '../config/constants.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';

class UsersManagementView extends StatefulWidget {
  final UserModel currentUser;

  const UsersManagementView({super.key, required this.currentUser});

  @override
  State<UsersManagementView> createState() => _UsersManagementViewState();
}

class _UsersManagementViewState extends State<UsersManagementView> {
  List<UserModel> _users = [];
  List<UserModel> _filteredUsers = [];
  bool _isLoading = true;
  String _searchQuery = "";

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() => _isLoading = true);
    try {
      final users = await ApiService.fetchSystemUsers();
      if (mounted) {
        setState(() {
          _users = users;
          _applyFilter();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading user accounts: $e')),
        );
      }
    }
  }

  void _applyFilter() {
    if (_searchQuery.trim().isEmpty) {
      _filteredUsers = List.from(_users);
    } else {
      final q = _searchQuery.toLowerCase();
      _filteredUsers = _users.where((u) {
        return u.name.toLowerCase().contains(q) || u.empId.toLowerCase().contains(q) || u.userType.toLowerCase().contains(q) || u.mobile.contains(q);
      }).toList();
    }
  }

  void _showUserDialog({UserModel? user}) {
    final isEdit = user != null;
    final empIdController = TextEditingController(text: user?.empId ?? '');
    final nameController = TextEditingController(text: user?.name ?? '');
    final emailController = TextEditingController(text: user?.email ?? '');
    final mobileController = TextEditingController(text: user?.mobile ?? '');
    final passwordController = TextEditingController(text: 'Welcome@123');
    String userType = user?.userType ?? 'ophthalmic_officer';
    String assignedTrack = user?.assignedTrack ?? widget.currentUser.assignedTrack ?? 'Sankara Eye Hospital Shimoga';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          isEdit ? "Edit Staff User" : "Create New Staff Account",
          style: const TextStyle(fontWeight: FontWeight.w900, color: AppConstants.navyDark),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: empIdController,
                readOnly: isEdit,
                decoration: const InputDecoration(
                  labelText: "Employee / Staff ID *",
                  hintText: "000470",
                  prefixIcon: Icon(Icons.badge),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: "Full Name *",
                  hintText: "Anitha S",
                  prefixIcon: Icon(Icons.person),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: userType,
                decoration: const InputDecoration(labelText: "Staff Role *"),
                items: const [
                  DropdownMenuItem(value: "ophthalmic_officer", child: Text("Ophthalmic Officer")),
                  DropdownMenuItem(value: "asha_worker", child: Text("ASHA Worker")),
                  DropdownMenuItem(value: "outreach", child: Text("Outreach / Field Staff")),
                  DropdownMenuItem(value: "admin", child: Text("Admin")),
                  DropdownMenuItem(value: "admin_unit", child: Text("Admin - Unit Level")),
                  DropdownMenuItem(value: "vision_center", child: Text("Vision Center Officer")),
                  DropdownMenuItem(value: "doctor", child: Text("Doctor / Ophthalmologist")),
                  DropdownMenuItem(value: "field_user", child: Text("Field Screener")),
                  DropdownMenuItem(value: "facility_manager", child: Text("Facility Manager")),
                  DropdownMenuItem(value: "super_admin", child: Text("Super Admin")),
                ],
                onChanged: (val) => userType = val ?? 'ophthalmic_officer',
              ),
              const SizedBox(height: 12),
              TextField(
                controller: mobileController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: "Mobile Number",
                  hintText: "9845000000",
                  prefixIcon: Icon(Icons.phone),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: "Email Address",
                  hintText: "staff@sankaraeye.com",
                  prefixIcon: Icon(Icons.email),
                ),
              ),
              if (!isEdit) ...[
                const SizedBox(height: 12),
                TextField(
                  controller: passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: "Default Password",
                    hintText: "Welcome@123",
                    prefixIcon: Icon(Icons.lock),
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.primaryOrange,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              if (empIdController.text.trim().isEmpty || nameController.text.trim().isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Employee ID and Full Name are required')),
                );
                return;
              }

              final payload = {
                'empId': empIdController.text.trim(),
                'name': nameController.text.trim(),
                'userType': userType,
                'email': emailController.text.trim(),
                'mobile': mobileController.text.trim(),
                'password': passwordController.text.trim(),
                'assignedTrack': assignedTrack,
              };

              Navigator.pop(context);
              setState(() => _isLoading = true);

              try {
                if (isEdit) {
                  await ApiService.updateSystemUser(user.id, payload);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('User account updated successfully!')),
                  );
                } else {
                  await ApiService.createSystemUser(payload);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('New staff account created!')),
                  );
                }
                _loadUsers();
              } catch (e) {
                setState(() => _isLoading = false);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed: $e')),
                );
              }
            },
            child: Text(isEdit ? "Save Changes" : "Create Account"),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteUser(UserModel u) {
    if (u.userType == 'super_admin' && widget.currentUser.userType != 'super_admin') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Only Super Admin can modify or delete Super Admin accounts')),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Delete User Account?"),
        content: Text("Are you sure you want to delete ${u.name} (${u.empId})?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppConstants.dangerRed),
            onPressed: () async {
              Navigator.pop(context);
              setState(() => _isLoading = true);
              try {
                await ApiService.deleteSystemUser(u.id);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('User account deleted')),
                );
                _loadUsers();
              } catch (e) {
                setState(() => _isLoading = false);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed: $e')),
                );
              }
            },
            child: const Text("Delete", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundLight,
      appBar: AppBar(
        backgroundColor: AppConstants.navyDark,
        title: const Text("Staff Accounts", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh, color: Colors.white), onPressed: _loadUsers),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showUserDialog(),
        backgroundColor: AppConstants.primaryOrange,
        icon: const Icon(Icons.person_add, color: Colors.white),
        label: const Text("ADD USER", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(12),
            child: TextField(
              onChanged: (val) {
                setState(() {
                  _searchQuery = val;
                  _applyFilter();
                });
              },
              decoration: InputDecoration(
                hintText: "Search by Name, Emp ID, Mobile, Role...",
                prefixIcon: const Icon(Icons.search, color: AppConstants.primaryOrange),
                filled: true,
                fillColor: AppConstants.backgroundLight,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredUsers.isEmpty
                    ? const Center(child: Text("No staff user accounts found."))
                    : RefreshIndicator(
                        onRefresh: _loadUsers,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _filteredUsers.length,
                          itemBuilder: (context, index) {
                            final u = _filteredUsers[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              elevation: 1,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: AppConstants.primaryOrange.withValues(alpha: 0.15),
                                  child: Text(
                                    u.name.isNotEmpty ? u.name[0].toUpperCase() : 'U',
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppConstants.primaryOrange),
                                  ),
                                ),
                                title: Text(u.name, style: const TextStyle(fontWeight: FontWeight.bold, color: AppConstants.navyDark)),
                                subtitle: Text("ID: ${u.empId} • Role: ${u.userType.toUpperCase().replaceAll('_', ' ')}"),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.edit, color: Colors.blue, size: 20),
                                      onPressed: () => _showUserDialog(user: u),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, color: AppConstants.dangerRed, size: 20),
                                      onPressed: () => _confirmDeleteUser(u),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
