'use client'

import * as React from 'react'
import { type LucideIcon } from 'lucide-react'
import Link from 'next/link'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
// Removed badge usage for coming soon items
// Using SidebarMenuButton tooltip prop for full-button tooltips

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    comingSoon?: boolean
    type?: 'link' | 'label'
  }[]
}) {
  const { isMobile, setOpenMobile } = useSidebar()

  const handleNavigate = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [isMobile, setOpenMobile])

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {/* <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Recensera vin"
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
            >
              <PlusCircleIcon />
              <span>Recensera vin</span>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <MailIcon />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem> */}
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.type === 'label' ? (
                <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground cursor-default select-none group-data-[collapsible=icon]:hidden">
                  {item.title}
                </div>
              ) : (
                <SidebarMenuButton
                  asChild={!item.comingSoon}
                  tooltip={
                    item.comingSoon ? { children: 'Kommer snart', hidden: false } : item.title
                  }
                  className={
                    item.comingSoon
                      ? 'relative cursor-default opacity-60 hover:bg-transparent'
                      : 'hover:bg-accent [&:hover_svg]:text-secondary'
                  }
                >
                  {item.comingSoon ? (
                    <div className="flex items-center gap-2">
                      {item.icon && <item.icon className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-muted-foreground group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </div>
                  ) : (
                    <Link href={item.url} onClick={handleNavigate}>
                      {item.icon && <item.icon />}
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  )}
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
