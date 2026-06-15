-- =====================================================
-- AI Restaurant System Database Schema
-- =====================================================

-- Create MenuItems table
CREATE TABLE IF NOT EXISTS MenuItems (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(255) NOT NULL,
    Category VARCHAR(100) NOT NULL,
    Price DECIMAL(10, 2) NOT NULL,
    CostPrice DECIMAL(10, 2) NOT NULL,
    IsAvailable BOOLEAN DEFAULT TRUE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (Category),
    INDEX idx_name (Name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Orders table
CREATE TABLE IF NOT EXISTS Orders (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    MenuItemId INT NOT NULL,
    MenuItemName VARCHAR(255) NOT NULL,
    Quantity INT NOT NULL,
    TotalPrice DECIMAL(10, 2) NOT NULL,
    OrderedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Status VARCHAR(50) DEFAULT 'Pending',
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (MenuItemId) REFERENCES MenuItems(Id) ON DELETE CASCADE,
    INDEX idx_menu_item_id (MenuItemId),
    INDEX idx_ordered_at (OrderedAt),
    INDEX idx_status (Status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create CompetitorPrices table
CREATE TABLE IF NOT EXISTS CompetitorPrices (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    Restaurant VARCHAR(255) NOT NULL,
    City VARCHAR(100) NOT NULL,
    DishCategory VARCHAR(100) NOT NULL,
    DishName VARCHAR(255) NOT NULL,
    MinPrice DECIMAL(10, 2) NOT NULL,
    MaxPrice DECIMAL(10, 2) NOT NULL,
    Source VARCHAR(100) DEFAULT '',
    CollectedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dish_category (DishCategory),
    INDEX idx_city (City),
    INDEX idx_restaurant (Restaurant),
    INDEX idx_collected_at (CollectedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Festivals table (optional, for storing festival metadata)
CREATE TABLE IF NOT EXISTS Festivals (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(255) NOT NULL,
    FestivalDate DATE NOT NULL,
    Icon VARCHAR(50) DEFAULT '',
    Description TEXT,
    ExpectedGrowthPercent DECIMAL(5, 2) DEFAULT 0,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_festival_date (FestivalDate),
    INDEX idx_name (Name),
    UNIQUE KEY unique_festival_date (FestivalDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create FestivalAnalytics table (optional, for storing festival predictions)
CREATE TABLE IF NOT EXISTS FestivalAnalytics (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    FestivalId INT,
    FestivalDate DATE NOT NULL,
    MenuItemId INT NOT NULL,
    DishName VARCHAR(255) NOT NULL,
    LastYearSales INT DEFAULT 0,
    PredictedSales INT DEFAULT 0,
    GrowthPercent DECIMAL(5, 2) DEFAULT 0,
    Rank INT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (MenuItemId) REFERENCES MenuItems(Id) ON DELETE CASCADE,
    FOREIGN KEY (FestivalId) REFERENCES Festivals(Id) ON DELETE SET NULL,
    INDEX idx_festival_id (FestivalId),
    INDEX idx_festival_date (FestivalDate),
    INDEX idx_menu_item_id (MenuItemId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Optional: Create Users table for authentication
-- =====================================================

CREATE TABLE IF NOT EXISTS Users (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    Username VARCHAR(100) NOT NULL UNIQUE,
    Email VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(500) NOT NULL,
    Role VARCHAR(50) NOT NULL DEFAULT 'User',
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (Username),
    INDEX idx_email (Email),
    INDEX idx_role (Role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Optional: Create Audit log table
-- =====================================================

CREATE TABLE IF NOT EXISTS AuditLogs (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    UserId INT,
    Action VARCHAR(100) NOT NULL,
    TableName VARCHAR(100),
    RecordId INT,
    OldValue JSON,
    NewValue JSON,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE SET NULL,
    INDEX idx_created_at (CreatedAt),
    INDEX idx_user_id (UserId),
    INDEX idx_table_name (TableName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Sample insert statements
-- =====================================================

-- Insert sample menu items
INSERT INTO MenuItems (Name, Category, Price, CostPrice) VALUES
('Biryani', 'Main', 180.00, 80.00),
('Fried Rice', 'Main', 150.00, 70.00),
('Noodles', 'Main', 140.00, 60.00),
('Burger', 'Fast Food', 120.00, 50.00),
('Pizza', 'Fast Food', 250.00, 120.00);

-- Insert sample festivals
INSERT INTO Festivals (Name, FestivalDate, Icon, Description, ExpectedGrowthPercent) VALUES
('Pongal', '2026-01-14', '🪔', 'Tamil harvest festival', 25.0),
('Republic Day', '2026-01-26', '🇮🇳', 'National celebration', 15.0),
('Tamil New Year', '2026-04-14', '🌸', 'Chithirai festival', 20.0),
('Diwali', '2026-11-12', '🎆', 'Festival of lights', 30.0),
('Christmas', '2026-12-25', '🎄', 'Christmas celebration', 18.0);

-- =====================================================
-- End of schema
-- =====================================================
