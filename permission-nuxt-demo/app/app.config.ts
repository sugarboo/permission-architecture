export default defineAppConfig({
  ui: {
    input: {
      slots: {
        base: 'bg-white dark:bg-white text-slate-900 dark:text-slate-900 ring-slate-200 dark:ring-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-400'
      }
    },
    select: {
      slots: {
        base: 'bg-white dark:bg-white text-slate-900 dark:text-slate-900 ring-slate-200 dark:ring-slate-200'
      }
    },
    textarea: {
      slots: {
        base: 'bg-white dark:bg-white text-slate-900 dark:text-slate-900 ring-slate-200 dark:ring-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-400'
      }
    },
    modal: {
      slots: {
        overlay: 'bg-slate-950/25 dark:bg-slate-950/25 backdrop-blur-[2px]',
        content: 'bg-white dark:bg-white text-slate-700 dark:text-slate-700 divide-slate-100 dark:divide-slate-100 ring-slate-200 dark:ring-slate-200 shadow-2xl',
        header: 'bg-white dark:bg-white',
        body: 'bg-white dark:bg-white',
        footer: 'bg-slate-50/80 dark:bg-slate-50/80',
        title: 'text-slate-950 dark:text-slate-950',
        description: 'text-slate-500 dark:text-slate-500'
      }
    },
    slideover: {
      slots: {
        overlay: 'bg-slate-950/25 dark:bg-slate-950/25 backdrop-blur-[2px]',
        content: 'bg-white dark:bg-white text-slate-700 dark:text-slate-700 divide-slate-100 dark:divide-slate-100 ring-slate-200 dark:ring-slate-200 shadow-2xl',
        header: 'bg-white dark:bg-white',
        body: 'bg-white dark:bg-white',
        footer: 'bg-slate-50/80 dark:bg-slate-50/80',
        title: 'text-slate-950 dark:text-slate-950',
        description: 'text-slate-500 dark:text-slate-500'
      }
    }
  }
})
