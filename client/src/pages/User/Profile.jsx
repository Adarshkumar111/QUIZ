import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { userAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { FaCamera, FaEdit, FaUser, FaBook, FaClock, FaAward, FaTimes } from 'react-icons/fa';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const updateUser = useAuthStore((state) => state.updateUser);
  const currentUser = useAuthStore((state) => state.user);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    course: '',
    semester: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await userAPI.getProfile();
      const data = res.data;
      setProfile(data);
      updateUser(data);
      
      // Initialize form data
      setFormData({
        username: data.username || '',
        bio: data.bio || '',
        course: data.course || '',
        semester: data.semester || '',
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setAvatarFile(file);
      setPreviewAvatar(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = new FormData();
      data.append('username', formData.username);
      data.append('bio', formData.bio);
      data.append('course', formData.course);
      data.append('semester', formData.semester);
      if (avatarFile) {
        data.append('avatar', avatarFile);
      }

      const res = await userAPI.updateProfile(data);
      setProfile(res.data);
      updateUser(res.data);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="animate-pulse">Loading profile...</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header / Cover */}
      <div className="relative h-48 md:h-64 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-20"></div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent"></div>
      </div>

      <div className="relative px-4 sm:px-8 -mt-24 sm:-mt-32 pb-8">
        <div className="flex flex-col sm:flex-row items-end sm:items-end gap-6">
          {/* Avatar */}
          <div className="relative group shrink-0">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-slate-950 bg-slate-800 overflow-hidden shadow-2xl relative">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.username}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-500">
                  {profile.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {/* Online Status Indicator */}
            <div className="absolute bottom-4 right-4 w-5 h-5 bg-emerald-500 rounded-full border-4 border-slate-950 shadow-sm animate-pulse"></div>
          </div>

          {/* Identity */}
          <div className="flex-1 pb-2 text-center sm:text-left space-y-2">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                {profile.username}
              </h1>
              <p className="text-slate-300 font-medium text-lg">{profile.email}</p>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-primary-300 uppercase tracking-wider backdrop-blur-md">
                {profile.role}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 backdrop-blur-md">
                <FaClock className="w-3 h-3" />
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pb-4 shrink-0">
            <button
              onClick={() => setIsEditing(true)}
              className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transition-all"
            >
              <FaEdit className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
          {/* Left Column: Details & Gamification */}
          <div className="space-y-6 lg:col-span-1">
            {/* Gamification Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="card bg-gradient-to-br from-slate-900 to-slate-900 border-indigo-500/10"
            >
              <div className="flex items-center gap-2 mb-6 text-indigo-400">
                <FaAward className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Achievements</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                  <div className="text-3xl font-black text-white mb-1">{profile.level || 1}</div>
                  <div className="text-xs text-slate-500 font-medium uppercase">Level</div>
                </div>
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                  <div className="text-3xl font-black text-indigo-400 mb-1">{profile.xpPoints || 0}</div>
                  <div className="text-xs text-slate-500 font-medium uppercase">XP Earned</div>
                </div>
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 col-span-2">
                  <div className="text-3xl font-black text-primary-400 mb-1">#{profile.globalRank || '...'}</div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-widest">Global Rank</div>
                </div>
              </div>
            </motion.div>

            {/* Academic Info */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="card p-6"
            >
               <div className="flex items-center gap-2 mb-6 text-emerald-400">
                <FaBook className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Academic Info</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-sm text-slate-400">Course</span>
                  <span className="text-sm font-medium text-slate-200">{profile.course || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-sm text-slate-400">Semester</span>
                  <span className="text-sm font-medium text-slate-200">{profile.semester || 'Not set'}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: About & Bio */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="card h-full"
            >
              <div className="flex items-center gap-2 mb-6 text-sky-400">
                <FaUser className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">About Me</h3>
              </div>
              
              {profile.bio ? (
                <p className="text-slate-300 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                  {profile.bio}
                </p>
              ) : (
                <div className="text-center py-12 bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                  <p className="text-slate-500 text-sm">Tell us something about yourself.</p>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-primary-400 text-sm hover:underline mt-2 font-medium"
                  >
                    Add a bio
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) setIsEditing(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <h2 className="text-xl font-bold text-white">Edit Profile</h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Avatar Upload */}
                <div className="flex justify-center">
                  <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-700 group-hover:border-primary-500 transition-colors">
                      <img
                        src={previewAvatar || profile.avatar || `https://ui-avatars.com/api/?name=${formData.username}`}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                      <FaCamera className="w-6 h-6 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-600"
                      placeholder="Enter username"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">Course</label>
                        <input
                        type="text"
                        name="course"
                        value={formData.course}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-600"
                        placeholder="e.g. BCA"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">Semester</label>
                        <input
                        type="text"
                        name="semester"
                        value={formData.semester}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-600"
                        placeholder="e.g. 5th"
                        />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">Bio</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-600 resize-none"
                      placeholder="Tell us a bit about yourself..."
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary px-6 py-2 flex items-center gap-2"
                  >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
