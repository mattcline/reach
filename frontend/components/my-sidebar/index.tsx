'use client';

import { useRouter } from 'next/navigation';
import {
  Inbox, 
  FileText,
  File,
  CalendarCheck,
  Folder
} from 'lucide-react';

import { useSidebar } from 'context/sidebar';
import { useUser } from 'context/user';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter
} from 'components/ui/sidebar';
import { useSidebar as useUISidebar } from 'components/ui/sidebar';
import { ProfileDropdown } from 'components/profile-dropdown';
import { CompanyLogo } from 'components/company-logo';

export function MySidebar() {
  const router = useRouter();
  const { activeItem, setActiveItem } = useSidebar();
  const { open, setOpen } = useUISidebar();
  const { user } = useUser();

  function getGroup(items: any[]) {
    if (!user) return null;
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={{
                    children: item.title,
                    hidden: open,
                    className: "shadow-md shadow-blue-accent/50 ring ring-blue-accent/50",
                  }}
                  onClick={() => {
                    setActiveItem(item.title);

                    // collapse sidebar if inbox is clicked
                    if (new Set(["Inbox"]).has(item.title)) {
                      setOpen(false);
                      router.push(`/dashboard/${item.url}`);
                    }
                    else {
                      router.push(`/dashboard/${item.url}`)
                    }
                  }}
                  isActive={activeItem === item.title}
                  className="px-2.5 md:px-2 hover:cursor-pointer"
                >
                  <item.icon size={15}/>
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  if (!user) return null;
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="mt-4">
        <SidebarMenuButton className="hover:bg-transparent">
          <CompanyLogo />
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        { getGroup([
          {
            title: "Inbox",
            url: "inbox",
            icon: Inbox,
          },
          // {
          //   title: "Tasks",
          //   url: "tasks",
          //   icon: CalendarCheck,
          // },
          {
            title: "Documents",
            url: "documents",
            icon: Folder,
          },
        ])}
      </SidebarContent>
      <SidebarFooter className="flex items-center">
        <ProfileDropdown />
      </SidebarFooter>
    </Sidebar>
  )
}