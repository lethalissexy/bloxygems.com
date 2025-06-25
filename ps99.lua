-- Pet Scanner Script
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local GuiService = game:GetService("GuiService")
local StarterGui = game:GetService("StarterGui")
local VirtualInputManager = game:GetService("VirtualInputManager")
local Player = Players.LocalPlayer
local replicatedStorage = game:GetService("ReplicatedStorage")
local library = replicatedStorage:WaitForChild("Library")
local saveModule = require(library:WaitForChild("Client"):WaitForChild("Save"))
local tradingCommands = require(library:WaitForChild("Client"):WaitForChild("TradingCmds"))

-- Add these variables for item detection
local assetIds = {}
local goldAssetids = {}
local nameAssetIds = {}
local hugesTitanicsIds = {}

-- Initialize detection tables for Huges
for index, pet in next, replicatedStorage.__DIRECTORY.Pets.Huge:GetChildren() do
    local petData = require(pet)
    table.insert(assetIds, petData.thumbnail)
    table.insert(assetIds, petData.goldenThumbnail)
    table.insert(goldAssetids, petData.goldenThumbnail)
    table.insert(nameAssetIds, {
        ["name"] = petData.name,
        ["assetIds"] = {
            petData.thumbnail,
            petData.goldenThumbnail
        }
    })
    table.insert(hugesTitanicsIds, petData._id)
end

-- Initialize detection tables for Titanics
for index, pet in next, replicatedStorage.__DIRECTORY.Pets.Titanic:GetChildren() do
    local petData = require(pet)
    table.insert(assetIds, petData.thumbnail)
    table.insert(assetIds, petData.goldenThumbnail)
    table.insert(goldAssetids, petData.goldenThumbnail)
    table.insert(nameAssetIds, {
        ["name"] = petData.name,
        ["assetIds"] = {
            petData.thumbnail,
            petData.goldenThumbnail
        }
    })
    table.insert(hugesTitanicsIds, petData._id)
end

-- Clean up old instances
for _, gui in pairs(game.CoreGui:GetChildren()) do
    if gui.Name == "PetScannerGui" then gui:Destroy() end
end

-- Performance settings
_G.isScanning = false  -- Using _G to ensure global access
local scanDelay = 0.1
local lastScanTime = 0
local lastDetectedPet = ""
local tooltipCache = {}

-- Add near the top with other settings
local lastStatusVisible = false
local lastConfirmedState = false

-- Add these variables at the top with other variables
local InfoOverlay = Player.PlayerGui:WaitForChild("InfoOverlay")
local lastProcessedContent = nil

-- Add these variables near the top with other variables
local scannedPets = {}
local HOVER_COOLDOWN = 3 -- 3 second cooldown between scans of the same pet

-- Create modern UI
local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "PetScannerGui"
ScreenGui.Parent = game.CoreGui
ScreenGui.ResetOnSpawn = false

local MainFrame = Instance.new("Frame")
MainFrame.Name = "MainFrame"
MainFrame.Size = UDim2.new(0, 280, 0, 350)
MainFrame.Position = UDim2.new(1, -290, 0.5, -175)
MainFrame.BackgroundColor3 = Color3.fromRGB(25, 25, 25)
MainFrame.BorderSizePixel = 0
MainFrame.Parent = ScreenGui

-- Modern rounded corners
local UICorner = Instance.new("UICorner")
UICorner.CornerRadius = UDim.new(0, 10)
UICorner.Parent = MainFrame

-- Title bar
local TitleBar = Instance.new("Frame")
TitleBar.Name = "TitleBar"
TitleBar.Size = UDim2.new(1, 0, 0, 40)
TitleBar.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
TitleBar.BorderSizePixel = 0
TitleBar.Parent = MainFrame

local TitleCorner = Instance.new("UICorner")
TitleCorner.CornerRadius = UDim.new(0, 10)
TitleCorner.Parent = TitleBar

-- Title
local Title = Instance.new("TextLabel")
Title.Text = "Pet Scanner Pro"
Title.Size = UDim2.new(1, -120, 1, 0)
Title.Position = UDim2.new(0, 15, 0, 0)
Title.BackgroundTransparency = 1
Title.TextColor3 = Color3.fromRGB(255, 255, 255)
Title.TextSize = 18
Title.Font = Enum.Font.GothamBold
Title.TextXAlignment = Enum.TextXAlignment.Left
Title.Parent = TitleBar

-- Toggle button
local ToggleButton = Instance.new("TextButton")
ToggleButton.Size = UDim2.new(0, 50, 0, 24)
ToggleButton.Position = UDim2.new(1, -60, 0, 8)
ToggleButton.BackgroundColor3 = Color3.fromRGB(255, 50, 50)
ToggleButton.Text = "OFF"
ToggleButton.TextColor3 = Color3.fromRGB(255, 255, 255)
ToggleButton.TextSize = 14
ToggleButton.Font = Enum.Font.GothamBold
ToggleButton.Parent = TitleBar

local ToggleCorner = Instance.new("UICorner")
ToggleCorner.CornerRadius = UDim.new(0, 6)
ToggleCorner.Parent = ToggleButton

-- Status indicator
local StatusDot = Instance.new("Frame")
StatusDot.Size = UDim2.new(0, 8, 0, 8)
StatusDot.Position = UDim2.new(1, -80, 0, 16)
StatusDot.BackgroundColor3 = Color3.fromRGB(255, 50, 50)
StatusDot.Parent = TitleBar

local StatusCorner = Instance.new("UICorner")
StatusCorner.CornerRadius = UDim.new(1, 0)
StatusCorner.Parent = StatusDot

-- Log container
local LogFrame = Instance.new("ScrollingFrame")
LogFrame.Name = "LogFrame"
LogFrame.Size = UDim2.new(1, -30, 1, -100)
LogFrame.Position = UDim2.new(0, 15, 0, 50)
LogFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
LogFrame.BorderSizePixel = 0
LogFrame.ScrollBarThickness = 3
LogFrame.ScrollBarImageColor3 = Color3.fromRGB(70, 70, 70)
LogFrame.Parent = MainFrame

local LogCorner = Instance.new("UICorner")
LogCorner.CornerRadius = UDim.new(0, 8)
LogCorner.Parent = LogFrame

-- Clear button
local ClearButton = Instance.new("TextButton")
ClearButton.Size = UDim2.new(0, 80, 0, 30)
ClearButton.Position = UDim2.new(0, 15, 1, -40)
ClearButton.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
ClearButton.TextColor3 = Color3.fromRGB(255, 255, 255)
ClearButton.Text = "Clear"
ClearButton.TextSize = 14
ClearButton.Font = Enum.Font.GothamBold
ClearButton.Parent = MainFrame

local ClearCorner = Instance.new("UICorner")
ClearCorner.CornerRadius = UDim.new(0, 6)
ClearCorner.Parent = ClearButton

-- Stats display
local StatsFrame = Instance.new("Frame")
StatsFrame.Size = UDim2.new(0, 120, 0, 30)
StatsFrame.Position = UDim2.new(1, -135, 1, -40)
StatsFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
StatsFrame.BorderSizePixel = 0
StatsFrame.Parent = MainFrame

local StatsCorner = Instance.new("UICorner")
StatsCorner.CornerRadius = UDim.new(0, 6)
StatsCorner.Parent = StatsFrame

local StatsText = Instance.new("TextLabel")
StatsText.Size = UDim2.new(1, 0, 1, 0)
StatsText.BackgroundTransparency = 1
StatsText.TextColor3 = Color3.fromRGB(200, 200, 200)
StatsText.TextSize = 12
StatsText.Font = Enum.Font.Gotham
StatsText.Text = "FPS: -- | Ping: --"
StatsText.Parent = StatsFrame

-- Logging system
local logEntries = {}
local maxLogEntries = 100

local function addLog(text, color)
    if #logEntries >= maxLogEntries then
        local oldestEntry = table.remove(logEntries, 1)
        if oldestEntry and oldestEntry.Instance then
            oldestEntry.Instance:Destroy()
        end
    end
    
    local entry = Instance.new("TextLabel")
    entry.Size = UDim2.new(1, -10, 0, 25)
    entry.Position = UDim2.new(0, 5, 0, #logEntries * 25)
    entry.BackgroundTransparency = 1
    entry.TextColor3 = color or Color3.fromRGB(255, 255, 255)
    entry.TextXAlignment = Enum.TextXAlignment.Left
    entry.TextSize = 14
    entry.Font = Enum.Font.Gotham
    entry.Text = string.format("[%s] %s", os.date("%H:%M:%S"), text)
    entry.Parent = LogFrame
    
    table.insert(logEntries, {
        Instance = entry,
        Timestamp = tick()
    })
    
    LogFrame.CanvasSize = UDim2.new(0, 0, 0, #logEntries * 25)
    LogFrame.CanvasPosition = Vector2.new(0, LogFrame.CanvasSize.Y.Offset)
end

-- Function to process InfoOverlay content
local function processInfoOverlay()
    local tradeWindow = Player.PlayerGui:FindFirstChild("TradeWindow")
    if not tradeWindow then return end
    
    local playerItems = tradeWindow.Frame:FindFirstChild("PlayerItems")
    if not playerItems then return end
    
    local items = playerItems:FindFirstChild("Items")
    if not items then return end
    
    -- Get trader name
    local traderName = ""
    local playerTitle = tradeWindow.Frame:FindFirstChild("PlayerTitle")
    if playerTitle and playerTitle:IsA("TextLabel") then
        traderName = playerTitle.Text
    end
    
    for _, item in pairs(items:GetChildren()) do
        if item.Name == "ItemSlot" then
            local icon = item:FindFirstChild("Icon")
            if icon and icon:IsA("ImageLabel") then
                -- Get pet name from asset ID
                local petName = nil
                for _, petData in pairs(nameAssetIds) do
                    if table.find(petData.assetIds, icon.Image) then
                        petName = petData.name
                        break
                    end
                end
                
                if petName then
                    -- Determine modifiers
                    local modifiers = {}
                    
                    -- Check for Rainbow
                    if icon:FindFirstChild("RainbowGradient") then
                        table.insert(modifiers, "Rainbow")
                    -- Check for Golden
                    elseif table.find(goldAssetids, icon.Image) then
                        table.insert(modifiers, "Golden")
                    end
                    
                    -- Check for Shiny
                    if item:FindFirstChild("ShinePulse") then
                        table.insert(modifiers, "Shiny")
                    end
                    
                    -- Construct full pet name
                    local fullPetName = #modifiers > 0 
                        and table.concat(modifiers, " ") .. " " .. petName
                        or petName
                    
                    -- Check if we've recently scanned this pet
                    local currentTime = tick()
                    if not scannedPets[fullPetName] or (currentTime - scannedPets[fullPetName]) > HOVER_COOLDOWN then
                        -- Update last scan time for this pet
                        scannedPets[fullPetName] = currentTime
                        
                        -- Log the pet
                        local logMessage = string.format("%s added: %s", 
                            traderName ~= "" and traderName or "Unknown",
                            fullPetName)
                        addLog(logMessage, Color3.fromRGB(0, 255, 100))
                    end
                end
            end
        end
    end
end

-- Pet scanning function
local function scanForPets()
    if not _G.isScanning then return end
    
    local currentTime = tick()
    if currentTime - lastScanTime < scanDelay then return end
    lastScanTime = currentTime
    
    pcall(function()
        -- Process InfoOverlay content
        processInfoOverlay()
        
        -- Get trader name (keep existing trader name detection)
        local traderName = ""
        local tradeWindow = Player.PlayerGui:FindFirstChild("TradeWindow")
        if tradeWindow then
            local playerTitle = tradeWindow:FindFirstChild("Frame", true) and 
                              tradeWindow.Frame:FindFirstChild("PlayerTitle")
            if playerTitle and playerTitle:IsA("TextLabel") then
                traderName = playerTitle.Text
            end
            
            -- Check Status and Confirmed state
            local playerItems = tradeWindow.Frame:FindFirstChild("PlayerItems")
            if playerItems then
                -- Check Status visibility
                local status = playerItems:FindFirstChild("Status")
                if status then
                    local isVisible = status.Visible
                    if isVisible ~= lastStatusVisible then
                        lastStatusVisible = isVisible
                        if isVisible then
                            addLog("Status became visible", Color3.fromRGB(255, 255, 0))
                        else
                            addLog("Status became hidden", Color3.fromRGB(255, 255, 0))
                        end
                    end
                end
                
                -- Check Confirmed state
                local confirmed = playerItems:FindFirstChild("Confirmed")
                if confirmed then
                    local isConfirmed = confirmed.Visible
                    if isConfirmed ~= lastConfirmedState then
                        lastConfirmedState = isConfirmed
                        if isConfirmed then
                            addLog("Trade Confirmed", Color3.fromRGB(0, 255, 100))
                        else
                            addLog("Trade Unconfirmed", Color3.fromRGB(255, 100, 100))
                        end
                    end
                end
            end
            
            -- Find and hover over each item slot
            local items = playerItems:FindFirstChild("Items")
            if items then
                task.spawn(function()
                    for _, slot in ipairs(items:GetChildren()) do
                        if slot:IsA("Frame") and slot.Name == "ItemSlot" then
                            simulateHover(slot)
                        end
                    end
                end)
            end
        end
        
        -- Now scan for pets with improved modifier detection
        for _, gui in ipairs(Player.PlayerGui:GetChildren()) do
            if gui:IsA("ScreenGui") and gui.Enabled then
                for _, frame in ipairs(gui:GetDescendants()) do
                    if frame:IsA("TextLabel") and frame.Visible then
                        local text = frame.Text
                        
                        -- First check if this is a tooltip
                        local isTooltip = false
                        local tooltipFrame = nil
                        local current = frame
                        while current and current ~= game do
                            if current.Name == "Tooltip" or current.Name == "TooltipFrame" then
                                isTooltip = true
                                tooltipFrame = current
                                break
                            end
                            current = current.Parent
                        end
                        
                        -- Clean up the text
                        text = text:gsub("★%s*", "")
                              :gsub("Exclusive%s*", "")
                              :gsub("Rare%s*", "")
                              :gsub("%s+", " ")
                              :gsub("^%s*(.-)%s*$", "%1")
                        
                        -- Check for Huge pet names
                        if text:match("^Huge%s+%w+") and not text:match("Rotation") and not text:match("Hatch") then
                            local modifiers = {}
                            
                            -- If we found a tooltip, scan ALL its children for modifiers
                            if tooltipFrame then
                                for _, child in ipairs(tooltipFrame:GetDescendants()) do
                                    if child:IsA("TextLabel") and child.Visible then
                                        local childText = child.Text
                                        -- Look for modifiers with specific colors
                                        if childText == "Rainbow" and child.TextColor3.R > 0.5 then
                                            table.insert(modifiers, "Rainbow")
                                        elseif childText == "Golden" and child.TextColor3.G > 0.5 then
                                            table.insert(modifiers, "Golden")
                                        elseif childText == "Shiny" and child.TextColor3.B > 0.5 then
                                            table.insert(modifiers, "Shiny")
                                        end
                                    end
                                end
                            end
                        end
                    end
                end
            end
        end
    end)
end

-- Toggle button functionality
ToggleButton.MouseButton1Click:Connect(function()
    _G.isScanning = not _G.isScanning
    
    -- Update visuals
    ToggleButton.BackgroundColor3 = _G.isScanning and Color3.fromRGB(50, 255, 50) or Color3.fromRGB(255, 50, 50)
    StatusDot.BackgroundColor3 = ToggleButton.BackgroundColor3
    ToggleButton.Text = _G.isScanning and "ON" or "OFF"
    
    -- Handle state change
    if _G.isScanning then
        addLog("Scanner Started", Color3.fromRGB(0, 255, 100))
        spawn(function()
            while _G.isScanning do
                scanForPets()
                wait(scanDelay)
            end
        end)
    else
        addLog("Scanner Stopped", Color3.fromRGB(255, 100, 100))
        lastDetectedPet = ""
    end
end)

-- Clear button functionality
ClearButton.MouseButton1Click:Connect(function()
    for _, entry in ipairs(logEntries) do
        if entry.Instance then entry.Instance:Destroy() end
    end
    table.clear(logEntries)
    LogFrame.CanvasSize = UDim2.new(0, 0, 0, 0)
    addLog("Logs Cleared", Color3.fromRGB(255, 200, 0))
end)

-- Make window draggable
local dragging = false
local dragStart
local startPos

TitleBar.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 then
        dragging = true
        dragStart = input.Position
        startPos = MainFrame.Position
    end
end)

TitleBar.InputEnded:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 then
        dragging = false
    end
end)

UserInputService.InputChanged:Connect(function(input)
    if dragging and input.UserInputType == Enum.UserInputType.MouseMovement then
        local delta = input.Position - dragStart
        MainFrame.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X,
                                     startPos.Y.Scale, startPos.Y.Offset + delta.Y)
    end
end)

-- Update stats
local function updateStats()
    local fps = math.floor(1/RunService.RenderStepped:Wait())
    local ping = math.floor(game:GetService("Stats").Network.ServerStatsItem["Data Ping"]:GetValue())
    StatsText.Text = string.format("FPS: %d | Ping: %dms", fps, ping)
end

-- Start with scanner off
addLog("Scanner Ready", Color3.fromRGB(0, 255, 255))

-- Main loop
RunService.RenderStepped:Connect(updateStats)

-- Memory cleanup
spawn(function()
    while wait(30) do
        collectgarbage("collect")
    end
end)

-- Add this function after the updateStats function
local function getInstancePath(instance)
    local path = {}
    local current = instance
    
    while current and current ~= game do
        local parent = current.Parent
        if not parent then break end
        
        local info = current.Name
        if current:IsA("TextLabel") or current:IsA("TextButton") then
            info = info .. " [" .. current.Text .. "]"
        end
        table.insert(path, 1, info)
        current = parent
    end
    
    return table.concat(path, " -> ")
end

-- Mouse click detection
local function setupClickCopy()
    local clickConnection = nil
    
    UserInputService.InputBegan:Connect(function(input)
        if input.KeyCode == Enum.KeyCode.LeftControl then
            -- Show active notification
            StarterGui:SetCore("SendNotification", {
                Title = "Click Mode Active",
                Text = "Click any UI element",
                Duration = 1
            })
            
            -- Handle click while Ctrl is held
            clickConnection = UserInputService.InputBegan:Connect(function(clickInput)
                if clickInput.UserInputType == Enum.UserInputType.MouseButton1 then
                    -- Get mouse position
                    local mousePos = UserInputService:GetMouseLocation()
                    
                    -- Find UI element under cursor
                    local elements = {}
                    
                    -- Function to check GUI elements
                    local function checkGui(gui)
                        if gui:IsA("ScreenGui") then
                            for _, desc in ipairs(gui:GetDescendants()) do
                                if desc:IsA("GuiObject") and desc.Visible then
                                    local pos = desc.AbsolutePosition
                                    local size = desc.AbsoluteSize
                                    
                                    if mousePos.X >= pos.X and mousePos.X <= pos.X + size.X and
                                       mousePos.Y >= pos.Y and mousePos.Y <= pos.Y + size.Y then
                                        -- Store element with its full path
                                        local path = {}
                                        local current = desc
                                        while current and current ~= game do
                                            local info = current.Name
                                            if current:IsA("TextLabel") or current:IsA("TextButton") then
                                                info = string.format("%s (%s) [%s]", current.Name, current.ClassName, current.Text)
                                            else
                                                info = string.format("%s (%s)", current.Name, current.ClassName)
                                            end
                                            table.insert(path, 1, info)
                                            current = current.Parent
                                        end
                                        table.insert(elements, {
                                            element = desc,
                                            path = table.concat(path, " -> "),
                                            zIndex = desc.ZIndex
                                        })
                                    end
                                end
                            end
                        end
                    end
                    
                    -- Check both PlayerGui and CoreGui
                    for _, gui in pairs(Player.PlayerGui:GetChildren()) do
                        checkGui(gui)
                    end
                    for _, gui in pairs(game.CoreGui:GetChildren()) do
                        checkGui(gui)
                    end
                    
                    -- Sort by ZIndex (top-most first)
                    table.sort(elements, function(a, b)
                        return a.zIndex > b.zIndex
                    end)
                    
                    -- Get top-most element
                    local topElement = elements[1]
                    if topElement then
                        setclipboard(topElement.path)
                        addLog("Copied path: " .. topElement.path, Color3.fromRGB(255, 255, 0))
                        
                        -- Show all elements under cursor for debugging
                        addLog("All elements at this position:", Color3.fromRGB(200, 200, 200))
                        for i, element in ipairs(elements) do
                            if i <= 5 then -- Show top 5 elements
                                addLog(i .. ": " .. element.path, Color3.fromRGB(200, 200, 200))
                            end
                        end
                    end
                end
            end)
        end
    end)

    -- Add handler for Ctrl key release
    UserInputService.InputEnded:Connect(function(input)
        if input.KeyCode == Enum.KeyCode.LeftControl then
            if clickConnection then
                clickConnection:Disconnect()
                clickConnection = nil
            end
        end
    end)
end

-- Show instructions
StarterGui:SetCore("SendNotification", {
    Title = "UI Element Finder",
    Text = "Hold Ctrl + Click to copy UI element info",
    Duration = 5
})

setupClickCopy()

-- Add a connection to monitor InfoOverlay changes
InfoOverlay.DescendantAdded:Connect(function()
    task.wait() -- Wait a frame for content to populate
    processInfoOverlay()
end)

-- Add cleanup for scannedPets
spawn(function()
    while wait(10) do
        local currentTime = tick()
        -- Clean up old entries
        for pet, lastSeen in pairs(scannedPets) do
            if currentTime - lastSeen > HOVER_COOLDOWN * 2 then
                scannedPets[pet] = nil
            end
        end
    end
end)