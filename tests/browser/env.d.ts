export {}

declare global {
  interface Window {
    _inertia_app_layout_id?: string
    _inertia_app_layout_mounts?: number
    _inertia_app_layout_disposals?: number
    _inertia_content_layout_id?: string
    _inertia_content_layout_mounts?: number
    _inertia_content_layout_disposals?: number
    _inertia_alternate_layout_mounts?: number
    _inertia_alternate_layout_disposals?: number
    _inertia_page_mounts?: number
    _inertia_page_disposals?: number
  }
}
