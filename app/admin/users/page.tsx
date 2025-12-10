"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldOff,
  Eye,
  MoreHorizontal,
  User,
  Calendar,
  Coins,
  X,
  Ban,
  Check,
  Send,
  Gift,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateUserRole, updateUserStatus, grantCredits, sendEmail } from "@/lib/admin/api";
import type { AdminUser, PaginatedResponse } from "@/types/admin";
import { toast } from "sonner";

/**
 * 유저 관리 페이지
 * - 유저 리스트 테이블
 * - 검색/페이지네이션
 * - 상세 보기, Admin 권한 토글
 * - 유저 차단/활성화
 * - 크레딧 수동 지급
 * - 이메일 발송
 */

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Modal states
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("관리자 지급");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const limit = 10;

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      // API Route를 통해 전체 유저 조회 (RLS 우회)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(searchQuery && { search: searchQuery }),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("유저 목록을 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadUsers();
  };

  const handleToggleAdmin = async (user: AdminUser) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await updateUserRole(user.id, newRole);
      toast.success(
        newRole === "admin"
          ? `${user.email}님에게 관리자 권한을 부여했습니다`
          : `${user.email}님의 관리자 권한을 해제했습니다`
      );
      loadUsers();
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("권한 변경에 실패했습니다");
    }
    setActionMenuOpen(null);
  };

  const handleToggleStatus = async (user: AdminUser) => {
    const newStatus = user.status === "blocked" ? "active" : "blocked";
    try {
      await updateUserStatus(user.id, newStatus);
      toast.success(
        newStatus === "blocked"
          ? `${user.email}님이 차단되었습니다`
          : `${user.email}님이 활성화되었습니다`
      );
      loadUsers();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("상태 변경에 실패했습니다");
    }
    setActionMenuOpen(null);
  };

  const handleGrantCredits = async () => {
    if (!selectedUser || !creditAmount) return;
    setIsSubmitting(true);
    try {
      const result = await grantCredits(selectedUser.id, Number(creditAmount), creditReason);
      if (result.success) {
        toast.success(`${selectedUser.email}님에게 ${creditAmount} 크레딧을 지급했습니다`);
        setShowCreditModal(false);
        setCreditAmount("");
        setCreditReason("관리자 지급");
        loadUsers();
      } else {
        toast.error(result.error || "크레딧 지급 실패");
      }
    } catch (error) {
      console.error("Failed to grant credits:", error);
      toast.error("크레딧 지급에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedUser || !emailSubject || !emailContent) return;
    setIsSubmitting(true);
    try {
      sendEmail(selectedUser.email!, emailSubject, emailContent);
      toast.success(`${selectedUser.email}님에게 이메일을 발송했습니다 (Mock)`);
      setShowEmailModal(false);
      setEmailSubject("");
      setEmailContent("");
    } catch (error) {
      console.error("Failed to send email:", error);
      toast.error("이메일 발송에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setShowCreditModal(true);
    setActionMenuOpen(null);
  };

  const openEmailModal = (user: AdminUser) => {
    setSelectedUser(user);
    setShowEmailModal(true);
    setActionMenuOpen(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">유저 관리</h1>
          <p className="text-slate-400">
            총 {users?.total || 0}명의 유저가 등록되어 있습니다
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              type="text"
              placeholder="이메일 또는 이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 bg-slate-800/50 border-slate-700"
            />
          </div>
          <Button type="submit" variant="outline" className="border-slate-700">
            검색
          </Button>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/20">
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-800 border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">유저</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">가입일</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">크레딧</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">역할</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">상태</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-mint border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : users?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    검색 결과가 없습니다
                  </td>
                </tr>
              ) : (
                users?.data.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mint/30 to-slate-700 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {user.full_name?.[0] || user.email?.[0] || "?"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.full_name || "이름 없음"}</p>
                          <p className="text-sm text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">
                      {new Date(user.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-mint">{user.credits?.current_credits || 0}</span>
                      <span className="text-xs text-slate-500 ml-1">크레딧</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-slate-700/50 text-slate-400 border border-slate-600/50"
                      }`}>
                        <Shield className="w-3 h-3" />
                        {user.role === "admin" ? "관리자" : "일반"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === "blocked"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-green-500/10 text-green-400 border border-green-500/20"
                      }`}>
                        {user.status === "blocked" ? <Ban className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                        {user.status === "blocked" ? "차단됨" : "활성"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon-sm" onClick={() => setSelectedUser(user)} className="text-slate-400 hover:text-white">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPosition({ x: rect.right, y: rect.bottom });
                            setActionMenuOpen(actionMenuOpen === user.id ? null : user.id);
                          }} 
                          className="text-slate-400 hover:text-white"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Action Menu (Portal - rendered outside table) */}
        <AnimatePresence>
          {actionMenuOpen && users?.data.find(u => u.id === actionMenuOpen) && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setActionMenuOpen(null)} />
              {/* Menu */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ top: menuPosition.y + 4, left: menuPosition.x - 220 }}
                className="fixed w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 py-2"
              >
                {(() => {
                  const user = users?.data.find(u => u.id === actionMenuOpen);
                  if (!user) return null;
                  return (
                    <>
                      <div className="px-4 py-2 border-b border-slate-700 mb-2">
                        <p className="text-sm font-medium text-white truncate">{user.email}</p>
                      </div>
                      <button onClick={() => handleToggleAdmin(user)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/50">
                        {user.role === "admin" ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        {user.role === "admin" ? "관리자 권한 해제" : "관리자 권한 부여"}
                      </button>
                      <button onClick={() => handleToggleStatus(user)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/50">
                        {user.status === "blocked" ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        {user.status === "blocked" ? "유저 활성화" : "유저 차단"}
                      </button>
                      <div className="border-t border-slate-700 my-2" />
                      <button onClick={() => openCreditModal(user)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-mint hover:bg-slate-700/50">
                        <Gift className="w-4 h-4" />
                        크레딧 지급
                      </button>
                      <button onClick={() => openEmailModal(user)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-400 hover:bg-slate-700/50">
                        <Send className="w-4 h-4" />
                        이메일 발송
                      </button>
                    </>
                  );
                })()}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {users && users.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
            <p className="text-sm text-slate-400">
              {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, users.total)} of {users.total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="border-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === users.totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="border-slate-700">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && !showCreditModal && !showEmailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">유저 상세 정보</h3>
                <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-mint/30 to-slate-700 flex items-center justify-center">
                    <span className="text-2xl font-medium text-white">
                      {selectedUser.full_name?.[0] || selectedUser.email?.[0] || "?"}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">{selectedUser.full_name || "이름 없음"}</h4>
                    <p className="text-slate-400">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-3 rounded-lg bg-slate-700/30">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">가입일</span>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {new Date(selectedUser.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-700/30">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Coins className="w-4 h-4" />
                      <span className="text-xs">크레딧</span>
                    </div>
                    <p className="text-sm font-medium text-mint">{selectedUser.credits?.current_credits || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-700/30">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <User className="w-4 h-4" />
                      <span className="text-xs">직무</span>
                    </div>
                    <p className="text-sm font-medium text-white">{selectedUser.job_type || "-"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-700/30">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Shield className="w-4 h-4" />
                      <span className="text-xs">역할</span>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {selectedUser.role === "admin" ? "관리자" : "일반 유저"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => { setShowCreditModal(true); }}
                    className="flex-1 gap-2 bg-mint/10 text-mint hover:bg-mint/20 border border-mint/20"
                  >
                    <Gift className="w-4 h-4" />
                    크레딧 지급
                  </Button>
                  <Button
                    onClick={() => { setShowEmailModal(true); }}
                    className="flex-1 gap-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
                  >
                    <Send className="w-4 h-4" />
                    이메일 발송
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credit Grant Modal */}
      <AnimatePresence>
        {showCreditModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">크레딧 지급</h3>
                <button onClick={() => setShowCreditModal(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-400">
                  대상: <span className="text-white font-medium">{selectedUser.email}</span>
                </p>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">지급할 크레딧</label>
                  <Input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="bg-slate-700/50 border-slate-600"
                    placeholder="예: 10"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">사유</label>
                  <Input
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    className="bg-slate-700/50 border-slate-600"
                    placeholder="관리자 지급"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
                <Button variant="outline" onClick={() => setShowCreditModal(false)} className="border-slate-600">취소</Button>
                <Button onClick={handleGrantCredits} disabled={isSubmitting || !creditAmount} className="gap-2 bg-mint text-slate-900 hover:bg-mint/90">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                  지급
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Modal */}
      <AnimatePresence>
        {showEmailModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEmailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">이메일 발송</h3>
                <button onClick={() => setShowEmailModal(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-400">
                  수신자: <span className="text-white font-medium">{selectedUser.email}</span>
                </p>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">제목</label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="bg-slate-700/50 border-slate-600"
                    placeholder="이메일 제목"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">내용</label>
                  <textarea
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-white resize-none"
                    rows={4}
                    placeholder="이메일 내용을 입력하세요..."
                  />
                </div>
                <p className="text-xs text-slate-500">* Mock 기능입니다. 실제 발송되지 않습니다.</p>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
                <Button variant="outline" onClick={() => setShowEmailModal(false)} className="border-slate-600">취소</Button>
                <Button onClick={handleSendEmail} disabled={isSubmitting || !emailSubject || !emailContent} className="gap-2 bg-blue-500 text-white hover:bg-blue-600">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  발송
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
