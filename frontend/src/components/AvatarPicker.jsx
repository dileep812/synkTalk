import { useMemo, useState } from 'react'

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Harley',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Sasha',
]

function AvatarPicker({ selectedAvatar, onSelect, avatarOptions = DEFAULT_AVATARS }) {
  const [uploadedPreview, setUploadedPreview] = useState('')

  const activeAvatar = useMemo(() => selectedAvatar || avatarOptions[0], [selectedAvatar, avatarOptions])

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const preview = String(reader.result || '')
      setUploadedPreview(preview)
      onSelect(preview)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <p className="text-sm font-semibold text-slate-700">Pick avatar</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {avatarOptions.map((image) => {
          const isActive = activeAvatar === image
          return (
            <button
              key={image}
              type="button"
              onClick={() => onSelect(image)}
              className={`rounded-xl border p-1 transition ${
                isActive ? 'border-cyan-500 ring-4 ring-cyan-100' : 'border-slate-200 hover:border-cyan-300'
              }`}
            >
              <img src={image} alt="Avatar option" className="h-14 w-14 rounded-lg" />
            </button>
          )
        })}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
        <label className="block text-sm font-semibold text-slate-700" htmlFor="custom-avatar-upload">
          Or upload custom avatar
        </label>
        <input
          id="custom-avatar-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mt-2 w-full text-sm text-slate-700"
        />
        {uploadedPreview && (
          <img src={uploadedPreview} alt="Uploaded avatar preview" className="mt-3 h-16 w-16 rounded-xl border border-slate-200 object-cover" />
        )}
      </div>
    </div>
  )
}

export { DEFAULT_AVATARS }
export default AvatarPicker
