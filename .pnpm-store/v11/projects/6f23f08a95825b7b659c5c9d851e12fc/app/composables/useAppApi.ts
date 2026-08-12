export function useAppApi() {
  const toast = useToast()

  function errorMessage(error: unknown) {
    const candidate = error as { data?: { statusMessage?: string, message?: string }, message?: string }
    return candidate?.data?.statusMessage || candidate?.data?.message || candidate?.message || '操作失败，请检查填写内容'
  }

  function showError(error: unknown, title = '保存失败') {
    toast.add({ title, description: errorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  }

  function showSuccess(title: string, description?: string) {
    toast.add({ title, description, color: 'success', icon: 'i-lucide-circle-check' })
  }

  return { errorMessage, showError, showSuccess }
}
