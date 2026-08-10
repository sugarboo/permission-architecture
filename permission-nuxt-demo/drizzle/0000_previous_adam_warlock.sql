CREATE TABLE `iam_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`summary` text NOT NULL,
	`detail_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `iam_user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_iam_audit_log_created` ON `iam_audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_iam_audit_log_entity` ON `iam_audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `iam_data_domain` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `demo_customer` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`owner_org_unit_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `iam_user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`owner_org_unit_id`) REFERENCES `org_unit`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_demo_customer_owner_user` ON `demo_customer` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `idx_demo_customer_owner_org` ON `demo_customer` (`owner_org_unit_id`);--> statement-breakpoint
CREATE TABLE `iam_function` (
	`permission_id` text PRIMARY KEY NOT NULL,
	`action_type` text NOT NULL,
	`data_scoped` integer DEFAULT false NOT NULL,
	`is_sensitive` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`permission_id`) REFERENCES `iam_permission`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `iam_menu_binding` (
	`menu_id` text NOT NULL,
	`permission_id` text NOT NULL,
	`bundle_level` text NOT NULL,
	`status` text DEFAULT 'PUBLISHED' NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`menu_id`, `permission_id`),
	FOREIGN KEY (`menu_id`) REFERENCES `iam_menu`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `iam_permission`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_iam_menu_binding_permission` ON `iam_menu_binding` (`permission_id`);--> statement-breakpoint
CREATE TABLE `iam_menu` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`node_type` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`permission_id` text,
	`route_path` text,
	`component_key` text,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`permission_id`) REFERENCES `iam_permission`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_iam_menu_code` ON `iam_menu` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_iam_menu_permission` ON `iam_menu` (`permission_id`);--> statement-breakpoint
CREATE INDEX `idx_iam_menu_parent_sort` ON `iam_menu` (`parent_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `org_closure` (
	`ancestor_id` text NOT NULL,
	`descendant_id` text NOT NULL,
	`depth` integer NOT NULL,
	PRIMARY KEY(`ancestor_id`, `descendant_id`),
	FOREIGN KEY (`ancestor_id`) REFERENCES `org_unit`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`descendant_id`) REFERENCES `org_unit`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_org_closure_descendant` ON `org_closure` (`descendant_id`);--> statement-breakpoint
CREATE TABLE `org_unit` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`unit_type` text NOT NULL,
	`leader_user_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`leader_user_id`) REFERENCES `iam_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_org_unit_code` ON `org_unit` (`code`);--> statement-breakpoint
CREATE INDEX `idx_org_unit_parent_sort` ON `org_unit` (`parent_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `iam_permission` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL,
	`data_domain_code` text,
	`risk_level` text DEFAULT 'LOW' NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_iam_permission_code` ON `iam_permission` (`code`);--> statement-breakpoint
CREATE INDEX `idx_iam_permission_type_status` ON `iam_permission` (`type`,`status`);--> statement-breakpoint
CREATE INDEX `idx_iam_permission_domain` ON `iam_permission` (`domain`);--> statement-breakpoint
CREATE TABLE `policy_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `iam_position_data_scope` (
	`id` text PRIMARY KEY NOT NULL,
	`position_id` text NOT NULL,
	`data_domain_code` text NOT NULL,
	`scope_type` text NOT NULL,
	`include_descendants` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`position_id`) REFERENCES `org_position`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`data_domain_code`) REFERENCES `iam_data_domain`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_position_data_scope_domain` ON `iam_position_data_scope` (`position_id`,`data_domain_code`);--> statement-breakpoint
CREATE INDEX `idx_position_data_scope_domain` ON `iam_position_data_scope` (`data_domain_code`);--> statement-breakpoint
CREATE TABLE `org_position` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`org_unit_id` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`suggested_role_id` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`org_unit_id`) REFERENCES `org_unit`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`suggested_role_id`) REFERENCES `iam_role`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_org_position_code` ON `org_position` (`code`);--> statement-breakpoint
CREATE INDEX `idx_org_position_unit` ON `org_position` (`org_unit_id`);--> statement-breakpoint
CREATE TABLE `iam_resource` (
	`permission_id` text PRIMARY KEY NOT NULL,
	`resource_type` text NOT NULL,
	`service_code` text NOT NULL,
	`http_method` text,
	`path_template` text,
	`sync_source` text DEFAULT 'MANUAL' NOT NULL,
	FOREIGN KEY (`permission_id`) REFERENCES `iam_permission`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_iam_resource_service` ON `iam_resource` (`service_code`);--> statement-breakpoint
CREATE TABLE `iam_role_permission` (
	`role_id` text NOT NULL,
	`permission_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`role_id`, `permission_id`),
	FOREIGN KEY (`role_id`) REFERENCES `iam_role`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `iam_permission`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_iam_role_permission_permission` ON `iam_role_permission` (`permission_id`);--> statement-breakpoint
CREATE TABLE `iam_role` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_iam_role_code` ON `iam_role` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_iam_role_name` ON `iam_role` (`name`);--> statement-breakpoint
CREATE INDEX `idx_iam_role_status` ON `iam_role` (`status`);--> statement-breakpoint
CREATE TABLE `iam_scope_department` (
	`scope_id` text NOT NULL,
	`org_unit_id` text NOT NULL,
	PRIMARY KEY(`scope_id`, `org_unit_id`),
	FOREIGN KEY (`scope_id`) REFERENCES `iam_position_data_scope`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`org_unit_id`) REFERENCES `org_unit`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `iam_user_permission` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`permission_id` text NOT NULL,
	`valid_from` text,
	`valid_to` text,
	`reason` text NOT NULL,
	`source_ticket` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `iam_user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `iam_permission`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_iam_user_permission_window` ON `iam_user_permission` (`user_id`,`permission_id`,`valid_from`);--> statement-breakpoint
CREATE INDEX `idx_iam_user_permission_user_valid` ON `iam_user_permission` (`user_id`,`valid_to`);--> statement-breakpoint
CREATE INDEX `idx_iam_user_permission_permission` ON `iam_user_permission` (`permission_id`);--> statement-breakpoint
CREATE TABLE `org_user_position` (
	`user_id` text NOT NULL,
	`position_id` text NOT NULL,
	`org_unit_id` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`valid_from` text,
	`valid_to` text,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `position_id`, `org_unit_id`),
	FOREIGN KEY (`user_id`) REFERENCES `iam_user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`position_id`) REFERENCES `org_position`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`org_unit_id`) REFERENCES `org_unit`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_org_user_position_position` ON `org_user_position` (`position_id`);--> statement-breakpoint
CREATE INDEX `idx_org_user_position_unit` ON `org_user_position` (`org_unit_id`);--> statement-breakpoint
CREATE TABLE `iam_user_role` (
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	`valid_from` text,
	`valid_to` text,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `role_id`),
	FOREIGN KEY (`user_id`) REFERENCES `iam_user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `iam_role`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_iam_user_role_role` ON `iam_user_role` (`role_id`);--> statement-breakpoint
CREATE TABLE `iam_user` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`employee_no` text NOT NULL,
	`display_name` text NOT NULL,
	`email` text,
	`phone` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`authz_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_iam_user_username` ON `iam_user` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_iam_user_employee_no` ON `iam_user` (`employee_no`);--> statement-breakpoint
CREATE INDEX `idx_iam_user_status` ON `iam_user` (`status`);