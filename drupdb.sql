-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 23, 2025 at 08:58 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `drupdb`
--

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `name`, `description`, `created_at`) VALUES
(2, 'Gramatvediba', '', '2025-05-16 12:44:06');

-- --------------------------------------------------------

--
-- Table structure for table `department_users`
--

CREATE TABLE `department_users` (
  `department_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `department_users`
--

INSERT INTO `department_users` (`department_id`, `user_id`) VALUES
(2, 11);

-- --------------------------------------------------------

--
-- Table structure for table `funding_sources`
--

CREATE TABLE `funding_sources` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `funding_sources`
--

INSERT INTO `funding_sources` (`id`, `name`, `description`, `created_at`) VALUES
(6, 'VeA', '', '2025-05-16 12:36:17'),
(7, 'ES', '', '2025-05-16 12:36:19');

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `budget` decimal(10,2) DEFAULT 0.00,
  `contract_number` varchar(255) DEFAULT NULL,
  `min_workload` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `projects`
--

INSERT INTO `projects` (`id`, `name`, `description`, `start_date`, `end_date`, `created_by`, `created_at`, `budget`, `contract_number`, `min_workload`) VALUES
(14, 'DRUP Izstrade', 'Sis projekts ir par DRUP izstradi', '2025-05-02', '2025-06-07', 12, '2025-05-16 12:39:47', 50.00, 'ABCD1234', 0),
(15, 'Mans Projekts', 'Projekta apraksts', '2025-05-01', '2028-05-17', 14, '2025-05-23 18:50:56', 50.00, 'ABC123LV', 0);

-- --------------------------------------------------------

--
-- Table structure for table `project_funding`
--

CREATE TABLE `project_funding` (
  `project_id` int(11) NOT NULL,
  `funding_source_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `percentage` decimal(5,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `project_funding`
--

INSERT INTO `project_funding` (`project_id`, `funding_source_id`, `amount`, `percentage`) VALUES
(14, 6, 25.00, 50.00),
(14, 7, 25.00, 50.00),
(15, 6, 25.00, 50.00),
(15, 7, 25.00, 50.00);

-- --------------------------------------------------------

--
-- Table structure for table `project_users`
--

CREATE TABLE `project_users` (
  `project_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` varchar(50) DEFAULT NULL,
  `workload` decimal(10,2) DEFAULT 0.00 COMMENT 'Workload in hours (not percentage)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `project_users`
--

INSERT INTO `project_users` (`project_id`, `user_id`, `role`, `workload`) VALUES
(14, 11, 'employee', 30.00),
(14, 12, 'employee', 20.00),
(15, 8, 'employee', 0.00),
(15, 11, 'employee', 0.00),
(15, 12, 'employee', 0.00),
(15, 13, 'employee', 0.00),
(15, 14, 'employee', 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `time_entries`
--

CREATE TABLE `time_entries` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `hours` decimal(5,2) NOT NULL,
  `description` text DEFAULT NULL,
  `entry_type` enum('work','vacation','sick_leave','holiday','other') DEFAULT 'work',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `time_entries`
--

INSERT INTO `time_entries` (`id`, `user_id`, `project_id`, `date`, `hours`, `description`, `entry_type`, `created_at`, `updated_at`) VALUES
(3, 11, 14, '2025-05-16', 8.00, 'Izveidoja Eksports sadaļu', 'work', '2025-05-16 12:40:35', '2025-05-16 12:40:35'),
(4, 13, 15, '2025-05-23', 8.00, 'Izveidoja DRUP sistēmā export sadaļu.', 'work', '2025-05-23 18:52:10', '2025-05-23 18:52:10');

-- --------------------------------------------------------

--
-- Table structure for table `time_entry_funding`
--

CREATE TABLE `time_entry_funding` (
  `time_entry_id` int(11) NOT NULL,
  `funding_source_id` int(11) NOT NULL,
  `percentage` decimal(5,2) NOT NULL DEFAULT 100.00,
  `hours` decimal(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `time_entry_funding`
--

INSERT INTO `time_entry_funding` (`time_entry_id`, `funding_source_id`, `percentage`, `hours`) VALUES
(3, 6, 50.00, 4.00),
(3, 7, 50.00, 4.00),
(4, 6, 20.00, 1.60),
(4, 7, 80.00, 6.40);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `full_name`, `email`, `role`, `created_at`) VALUES
(8, 'janiskocins', '$2b$10$WzWomNK/D1Tuqq6RUNU9EuCMLrSpFHCs3VatGeFR7OWU2yMBqZP5m', 'Janis Kocins', 'janiskocins@inbox.lv', 'project_manager', '2025-05-16 12:19:14'),
(11, 'darbinieks1', '$2b$10$gk6EJm.5Q4h3t0hKRogbgeSE6pru.g.PD3CEnnd6VwkRHrfREd/6S', 'darbinieks1', 'darbinieks1@darbinieks1.com', 'employee', '2025-05-16 12:29:40'),
(12, 'vaditajs1', '$2b$10$L0hWJAz0XJjlJNoIJnBZBeGbDz549oiBv8i8prNpThBqsCEzCJp9e', 'vaditajs1', 'vaditajs1@vaditajs1.com', 'project_manager', '2025-05-16 12:34:50'),
(13, 'darbinieks', '$2b$10$D78lzSKeodoaLjeqzRSGS.4atI2N9FUNIvqoQhPsnQcTbFZ1k4cMC', 'Pēteris Bērziņš', 'pecha34@yahoo.com', 'employee', '2025-05-23 18:48:55'),
(14, 'vaditajs', '$2b$10$BalZRMT1eu3CXHmCQ2aHJOKCc11iB1Ur04VqiiGOINVG5PRpvCOsW', 'Anna Līdaka', 'anna.lidaka@gmail.lv', 'project_manager', '2025-05-23 18:49:33');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `department_users`
--
ALTER TABLE `department_users`
  ADD PRIMARY KEY (`department_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `funding_sources`
--
ALTER TABLE `funding_sources`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `project_funding`
--
ALTER TABLE `project_funding`
  ADD PRIMARY KEY (`project_id`,`funding_source_id`);

--
-- Indexes for table `project_users`
--
ALTER TABLE `project_users`
  ADD PRIMARY KEY (`project_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `time_entries`
--
ALTER TABLE `time_entries`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `time_entry_funding`
--
ALTER TABLE `time_entry_funding`
  ADD PRIMARY KEY (`time_entry_id`,`funding_source_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `funding_sources`
--
ALTER TABLE `funding_sources`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `time_entries`
--
ALTER TABLE `time_entries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `department_users`
--
ALTER TABLE `department_users`
  ADD CONSTRAINT `department_users_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `department_users_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `project_users`
--
ALTER TABLE `project_users`
  ADD CONSTRAINT `project_users_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `project_users_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
