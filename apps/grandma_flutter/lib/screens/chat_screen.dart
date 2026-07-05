import "dart:async";

import "package:flutter/foundation.dart";
import "package:flutter/material.dart";
import "package:just_audio/just_audio.dart";
import "package:path_provider/path_provider.dart";
import "package:record/record.dart";

import "../models/chat_message.dart";
import "../models/contact.dart";
import "../services/api_client.dart";

class ChatScreen extends StatefulWidget {
  const ChatScreen({
    super.key,
    required this.apiClient,
    required this.contact,
  });

  final ApiClient apiClient;
  final Contact contact;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _player = AudioPlayer();

  final List<ChatMessage> _messages = <ChatMessage>[];
  Timer? _pollTimer;
  bool _isLoading = true;
  bool _isRefreshing = false;
  bool _isSending = false;
  bool _isRecording = false;
  bool _isPlaying = false;
  String? _playingMessageId;

  @override
  void initState() {
    super.initState();
    unawaited(widget.apiClient.markContactAsRead(widget.contact.id));
    _loadMessages(showLoading: true);
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _loadMessages();
    });
    _player.playerStateStream.listen((state) {
      if (!mounted) {
        return;
      }
      final active = state.playing && state.processingState != ProcessingState.completed;
      setState(() {
        _isPlaying = active;
        if (!active) {
          _playingMessageId = null;
        }
      });
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _recorder.dispose();
    _player.dispose();
    super.dispose();
  }

  Future<void> _loadMessages({bool showLoading = false}) async {
    if (_isRefreshing) {
      return;
    }
    if (showLoading) {
      setState(() {
        _isLoading = true;
      });
    }

    _isRefreshing = true;
    try {
      final data = await widget.apiClient.fetchMessages(widget.contact.id);
      await widget.apiClient.markContactAsRead(widget.contact.id);
      if (!mounted) {
        return;
      }
      setState(() {
        _messages
          ..clear()
          ..addAll(data);
      });
    } catch (_) {
      if (mounted && showLoading) {
        _showSnack("Σφάλμα φόρτωσης μηνυμάτων");
      }
    } finally {
      _isRefreshing = false;
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _startRecording() async {
    if (_isSending || _isRecording) {
      return;
    }

    final hasPermission = await _recorder.hasPermission();
    if (!hasPermission) {
      _showSnack("Δεν δόθηκε άδεια μικροφώνου.");
      return;
    }

    try {
      if (kIsWeb) {
        await _recorder.start(
          const RecordConfig(
            encoder: AudioEncoder.wav,
            sampleRate: 16000,
          ),
          path: "voice_${DateTime.now().millisecondsSinceEpoch}.wav",
        );
      } else {
        final tempDir = await getTemporaryDirectory();
        final path = "${tempDir.path}/voice_${DateTime.now().millisecondsSinceEpoch}.m4a";
        await _recorder.start(
          const RecordConfig(
            encoder: AudioEncoder.aacLc,
            bitRate: 128000,
            sampleRate: 44100,
          ),
          path: path,
        );
      }

      if (!mounted) {
        return;
      }
      setState(() {
        _isRecording = true;
      });
    } catch (_) {
      _showSnack("Αποτυχία έναρξης ηχογράφησης.");
    }
  }

  Future<void> _stopAndSendRecording() async {
    if (!_isRecording) {
      return;
    }

    setState(() {
      _isRecording = false;
      _isSending = true;
    });

    try {
      final filePath = await _recorder.stop();
      if (kIsWeb) {
        await widget.apiClient.sendAudioMessage(
          contactId: widget.contact.id,
          transcript: "Ηχογράφηση από web demo.",
        );
      } else if (filePath != null && filePath.isNotEmpty) {
        await widget.apiClient.sendAudioMessage(
          contactId: widget.contact.id,
          audioFilePath: filePath,
        );
      } else {
        _showSnack("Δεν βρέθηκε αρχείο ηχογράφησης.");
      }

      await _loadMessages();
    } catch (_) {
      _showSnack("Αποτυχία αποστολής φωνητικού.");
    } finally {
      if (!mounted) {
        return;
      }
      setState(() {
        _isSending = false;
      });
    }
  }

  Future<void> _togglePlayback(ChatMessage message) async {
    final audioUrl = message.audioUrl;
    if (audioUrl == null || audioUrl.isEmpty) {
      return;
    }

    try {
      if (_playingMessageId == message.id && _isPlaying) {
        await _player.stop();
        return;
      }

      await _player.stop();
      await _player.setUrl(audioUrl);
      if (!mounted) {
        return;
      }
      setState(() {
        _playingMessageId = message.id;
      });
      await _player.play();
    } catch (_) {
      _showSnack("Αποτυχία αναπαραγωγής.");
    }
  }

  void _showSnack(String text) {
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.contact.name),
        actions: [
          IconButton(
            onPressed: () => _loadMessages(showLoading: false),
            icon: const Icon(Icons.refresh),
            tooltip: "Ανανέωση",
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _buildMessagesBody(),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onLongPressStart: (_) => _startRecording(),
                      onLongPressEnd: (_) => _stopAndSendRecording(),
                      child: Container(
                        height: 72,
                        decoration: BoxDecoration(
                          color: _isRecording
                              ? const Color(0xFFE63946)
                              : const Color(0xFF2A9D8F),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          _isSending
                              ? "Αποστολή..."
                              : (_isRecording
                                  ? "Μίλα τώρα..."
                                  : "Κράτα πατημένο για φωνητικό"),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 18,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessagesBody() {
    if (_isLoading && _messages.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_messages.isEmpty) {
      return const Center(child: Text("Δεν υπάρχουν μηνύματα ακόμα."));
    }

    return ListView.builder(
      reverse: true,
      padding: const EdgeInsets.all(16),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
        final msg = _messages[_messages.length - 1 - index];
        final isOutgoing = msg.direction == "outgoing";
        final hasAudio = msg.audioUrl != null && msg.audioUrl!.isNotEmpty;
        final isCurrent = _playingMessageId == msg.id && _isPlaying;

        return Align(
          alignment: isOutgoing ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            constraints: const BoxConstraints(maxWidth: 300),
            decoration: BoxDecoration(
              color: isOutgoing ? const Color(0xFFFFD6A5) : const Color(0xFFE7E7E7),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  msg.text.isNotEmpty ? msg.text : "(φωνητικό χωρίς κείμενο)",
                ),
                if (hasAudio) ...[
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () => _togglePlayback(msg),
                    icon: Icon(isCurrent ? Icons.stop : Icons.play_arrow),
                    label: Text(isCurrent ? "Stop" : "Play"),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}
