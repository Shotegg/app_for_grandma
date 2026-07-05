import "package:flutter/material.dart";

import "../models/contact.dart";
import "../services/api_client.dart";
import "../widgets/contact_card.dart";
import "chat_screen.dart";

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<Contact>> _contactsFuture;

  @override
  void initState() {
    super.initState();
    _contactsFuture = widget.apiClient.fetchContacts();
  }

  Future<void> _refreshContacts() async {
    final data = await widget.apiClient.fetchContacts();
    if (!mounted) {
      return;
    }
    setState(() {
      _contactsFuture = Future.value(data);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Η οικογένειά μου"),
        actions: [
          IconButton(
            onPressed: _refreshContacts,
            icon: const Icon(Icons.refresh),
            tooltip: "Ανανέωση",
          ),
        ],
      ),
      body: FutureBuilder<List<Contact>>(
        future: _contactsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Text(
                "Σφάλμα φόρτωσης επαφών",
                style: Theme.of(context).textTheme.titleMedium,
              ),
            );
          }

          final contacts = snapshot.data ?? <Contact>[];
          if (contacts.isEmpty) {
            return const Center(child: Text("Δεν βρέθηκαν επαφές."));
          }

          return GridView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: contacts.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 14,
              mainAxisSpacing: 14,
              childAspectRatio: 0.78,
            ),
            itemBuilder: (context, index) {
              final contact = contacts[index];
              return ContactCard(
                contact: contact,
                onTap: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => ChatScreen(
                        apiClient: widget.apiClient,
                        contact: contact,
                      ),
                    ),
                  );
                  await _refreshContacts();
                },
              );
            },
          );
        },
      ),
    );
  }
}

