'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, MoreVertical, Landmark, Eye, LogOut, MessageSquare, Send, X } from 'lucide-react';
import type { ChannelDetail, ChannelComment, ChatMessage } from '@/shared/types';
import { apiClient } from '@/lib/api-client';

interface ChannelViewProps {
  channel: ChannelDetail;
  onBack: () => void;
  onJoinSuccess?: () => void;
}

export const ChannelView: React.FC<ChannelViewProps> = ({
  channel,
  onBack,
  onJoinSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'links'>('posts');
  const [isJoined, setIsJoined] = useState(channel.isJoined);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<ChatMessage[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Comments state
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [comments, setComments] = useState<ChannelComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Fetch real channel posts
  useEffect(() => {
    let active = true;
    setLoadingPosts(true);
    apiClient.getMessages(channel.id, 20)
      .then((history) => {
        if (active) setPosts(history);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (active) setLoadingPosts(false);
      });

    return () => { active = false; };
  }, [channel.id]);

  const handleOpenComments = async (postId: number) => {
    setSelectedPostId(postId);
    setLoadingComments(true);
    try {
      const list = await apiClient.getPostComments(channel.id, postId);
      setComments(list);
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPostId || !newCommentText.trim() || sendingComment) return;

    setSendingComment(true);
    try {
      const comment = await apiClient.sendPostComment(channel.id, selectedPostId, newCommentText.trim());
      setComments((prev) => [...prev, comment]);
      setNewCommentText('');
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim komentar.');
    } finally {
      setSendingComment(false);
    }
  };

  const handleJoin = async () => {
    setLoading(true);
    try {
      await apiClient.joinChannel(channel.id);
      setIsJoined(true);
      if (onJoinSuccess) onJoinSuccess();
    } catch (err: any) {
      alert(err.message || 'Gagal bergabung ke channel.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Apakah Anda yakin ingin keluar dari channel ini?')) return;
    setLoading(true);
    try {
      await apiClient.leaveChannel(channel.id);
      setIsJoined(false);
      if (onJoinSuccess) onJoinSuccess();
    } catch (err: any) {
      alert(err.message || 'Gagal keluar channel.');
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = apiClient.getAvatarUrl(channel.id);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black font-mono select-none overflow-y-auto relative">
      {/* Header */}
      <header className="px-3 py-2 border-b-2 border-black dark:border-white bg-white dark:bg-black flex items-center justify-between shrink-0">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-black dark:text-white" />
        </button>

        <span className="font-bold text-xs uppercase tracking-wider truncate px-2">
          Info Channel
        </span>

        <button className="w-8 h-8 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer">
          <MoreVertical className="w-4 h-4 text-black dark:text-white" />
        </button>
      </header>

      {/* Channel Header Banner */}
      <div className="p-6 flex flex-col items-center border-b border-black dark:border-white bg-neutral-50 dark:bg-neutral-950">
        <div className="w-20 h-20 border-2 border-black dark:border-white bg-white dark:bg-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={channel.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
            />
          ) : (
            <Landmark className="w-10 h-10 text-black dark:text-white" />
          )}
        </div>

        <h1 className="mt-4 font-bold text-base text-black dark:text-white text-center">
          {channel.title}
        </h1>
        <span className="text-xs text-neutral-500 mt-0.5">
          {channel.subscribersCount > 0 ? `${channel.subscribersCount} pelanggan` : 'Channel Telegram'}
        </span>
        {channel.username && (
          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mt-0.5">
            @{channel.username}
          </span>
        )}
        {channel.about && (
          <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 text-center max-w-sm">
            {channel.about}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 border-b border-black dark:border-white text-center text-xs">
        {(['posts', 'media', 'links'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`py-2 font-bold uppercase transition-colors cursor-pointer ${
              activeTab === t
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-white text-black dark:bg-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 border-r border-black dark:border-white last:border-r-0'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Posts List */}
      <div className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {loadingPosts && (
              <div className="text-center text-xs text-neutral-500 py-6">
                [ Memuat kiriman channel... ]
              </div>
            )}

            {!loadingPosts && posts.length === 0 && (
              <div className="text-center text-xs text-neutral-500 py-6 border border-dashed border-neutral-300 dark:border-neutral-800 p-4">
                [ Belum ada postingan di channel ini ]
              </div>
            )}

            {posts.map((post) => (
              <div
                key={post.id}
                className="border-2 border-black dark:border-white p-4 bg-white dark:bg-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4" />
                    <span className="font-bold text-xs">{channel.title}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    {new Date(post.date * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {post.media && post.media.type === 'photo' && (
                  <div className="my-2 border border-black dark:border-white overflow-hidden max-h-60 bg-black">
                    <img
                      src={apiClient.getMediaUrl(post.media.url)}
                      alt="Media post"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                )}

                <div className="py-2.5 text-xs whitespace-pre-wrap leading-relaxed">
                  {post.text || 'Kiriman media'}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800 text-[10px]">
                  <button
                    onClick={() => handleOpenComments(post.id)}
                    className="flex items-center gap-1.5 font-bold hover:underline cursor-pointer py-1 px-2 border border-black dark:border-white bg-neutral-100 dark:bg-neutral-900"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Lihat Komentar</span>
                  </button>

                  <div className="flex items-center gap-1 text-neutral-500">
                    <Eye className="w-3 h-3" />
                    <span>{post.commentsCount || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab !== 'posts' && (
          <div className="p-8 text-center text-xs text-neutral-500">
            [ Tidak ada {activeTab} di channel ini ]
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="p-4 border-t-2 border-black dark:border-white bg-white dark:bg-black">
        {isJoined ? (
          <button
            disabled={loading}
            onClick={handleLeave}
            className="w-full py-3 px-4 border-2 border-red-500 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold text-xs tracking-widest hover:opacity-90 cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>[ KELUAR DARI CHANNEL ]</span>
          </button>
        ) : (
          <button
            disabled={loading}
            onClick={handleJoin}
            className="w-full py-3 px-4 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold text-xs tracking-widest hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {loading ? '[ MEMPROSES... ]' : '[ GABUNG CHANNEL ]'}
          </button>
        )}
      </div>

      {/* Comments Drawer / Modal */}
      {selectedPostId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs font-mono"
          onClick={() => setSelectedPostId(null)}
        >
          <div
            className="w-full max-w-lg h-[80vh] bg-white dark:bg-black border-t-2 sm:border-2 border-black dark:border-white p-4 shadow-2xl flex flex-col text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-white mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="font-bold tracking-wider">KOMENTAR POSTINGAN #{selectedPostId}</span>
              </div>
              <button
                onClick={() => setSelectedPostId(null)}
                className="w-7 h-7 border border-black dark:border-white flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 p-1">
              {loadingComments && (
                <div className="p-6 text-center text-neutral-500">
                  [ Memuat komentar diskusi... ]
                </div>
              )}

              {!loadingComments && comments.length === 0 && (
                <div className="p-6 text-center text-neutral-500 border border-dashed border-neutral-300 dark:border-neutral-800">
                  [ Belum ada komentar pada kiriman ini. ]
                </div>
              )}

              {comments.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 border border-black dark:border-white bg-neutral-50 dark:bg-neutral-950"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px]">{c.senderName}</span>
                    <span className="text-[9px] text-neutral-500">
                      {new Date(c.date * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{c.text}</p>
                </div>
              ))}
            </div>

            {/* Write comment input */}
            <form onSubmit={handleSendComment} className="pt-2 border-t border-black dark:border-white flex gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Tulis komentar..."
                className="flex-1 border border-black dark:border-white px-2.5 py-2 text-xs bg-white dark:bg-black"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newCommentText.trim() || sendingComment}
                className="px-3 py-2 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
