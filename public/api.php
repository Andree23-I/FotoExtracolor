<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = isset($_GET['action']) ? $_GET['action'] : '';
$uploadsDir = __DIR__ . '/uploads/portfolio';

// Assicuriamoci che la cartella base esista
if (!file_exists($uploadsDir)) {
    mkdir($uploadsDir, 0777, true);
}

switch ($action) {
    case 'getPortfolio':
        $categories = [];
        $imagesByCategory = [];
        $orderFile = $uploadsDir . '/categories_order.json';
        $customOrder = [];

        if (file_exists($orderFile)) {
            $customOrder = json_decode(file_get_contents($orderFile), true) ?: [];
        }

        if (is_dir($uploadsDir)) {
            $items = scandir($uploadsDir);
            foreach ($items as $item) {
                if ($item !== '.' && $item !== '..' && is_dir($uploadsDir . '/' . $item)) {
                    $categoryName = $item;
                    $categories[] = $categoryName;
                    $catId = strtolower(preg_replace('/\s+/', '', $categoryName));
                    
                    $imagesByCategory[$catId] = [];
                    
                    $catPath = $uploadsDir . '/' . $categoryName;
                    $files = scandir($catPath);
                    foreach ($files as $file) {
                        if (preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $file)) {
                            // The URL path relative to the domain
                            $imagesByCategory[$catId][] = '/uploads/portfolio/' . rawurlencode($categoryName) . '/' . rawurlencode($file);
                        }
                    }
                }
            }
        }
        
        // Sort categories based on customOrder
        if (!empty($customOrder)) {
            usort($categories, function($a, $b) use ($customOrder) {
                $posA = array_search($a, $customOrder);
                $posB = array_search($b, $customOrder);
                if ($posA === false) $posA = 9999;
                if ($posB === false) $posB = 9999;
                return $posA - $posB;
            });
        }
        
        echo json_encode([
            "categories" => $categories,
            "imagesByCategory" => $imagesByCategory
        ]);
        break;

    case 'reorderCategories':
        $data = json_decode(file_get_contents('php://input'), true);
        $order = isset($data['order']) ? $data['order'] : [];
        if (!empty($order)) {
            file_put_contents($uploadsDir . '/categories_order.json', json_encode($order));
            echo json_encode(["success" => true]);
        } else {
            http_response_code(400);
            echo json_encode(["error" => "Ordine non valido"]);
        }
        break;

    case 'getServices':
        $servicesFile = __DIR__ . '/uploads/services.json';
        if (file_exists($servicesFile)) {
            echo file_get_contents($servicesFile);
        } else {
            echo json_encode(["it" => [], "en" => []]);
        }
        break;

    case 'saveServices':
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['services'])) {
            file_put_contents(__DIR__ . '/uploads/services.json', json_encode($data['services'], JSON_PRETTY_PRINT));
            echo json_encode(["success" => true]);
        } else {
            http_response_code(400);
            echo json_encode(["error" => "Dati mancanti"]);
        }
        break;

    case 'getConfig':
        $configFile = __DIR__ . '/uploads/config.json';
        if (file_exists($configFile)) {
            echo file_get_contents($configFile);
        } else {
            echo json_encode(["pageMode" => "chisiamo"]);
        }
        break;

    case 'saveConfig':
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['config'])) {
            file_put_contents(__DIR__ . '/uploads/config.json', json_encode($data['config'], JSON_PRETTY_PRINT));
            echo json_encode(["success" => true]);
        } else {
            http_response_code(400);
            echo json_encode(["error" => "Dati mancanti"]);
        }
        break;


    case 'createCategory':
        $data = json_decode(file_get_contents('php://input'), true);
        $name = isset($data['name']) ? trim($data['name']) : '';
        
        if (empty($name)) {
            http_response_code(400);
            echo json_encode(["error" => "Nome categoria mancante"]);
            exit;
        }

        $catPath = $uploadsDir . '/' . $name;
        if (!file_exists($catPath)) {
            mkdir($catPath, 0777, true);
            echo json_encode(["success" => true, "message" => "Categoria creata"]);
        } else {
            http_response_code(400);
            echo json_encode(["error" => "Categoria già esistente"]);
        }
        break;

    case 'deleteCategory':
        $name = isset($_GET['name']) ? trim($_GET['name']) : '';
        $catPath = $uploadsDir . '/' . $name;
        
        if (file_exists($catPath) && is_dir($catPath)) {
            // Delete all files inside first
            $files = array_diff(scandir($catPath), array('.','..')); 
            foreach ($files as $file) { 
                unlink("$catPath/$file"); 
            } 
            rmdir($catPath);
            echo json_encode(["success" => true, "message" => "Categoria eliminata"]);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Categoria non trovata"]);
        }
        break;

    case 'uploadImage':
        $category = isset($_POST['category']) ? trim($_POST['category']) : 'Uncategorized';
        $catPath = $uploadsDir . '/' . $category;
        
        if (!file_exists($catPath)) {
            mkdir($catPath, 0777, true);
        }

        if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
            $tmpName = $_FILES['photo']['tmp_name'];
            $fileName = time() . '-' . preg_replace('/\s+/', '_', $_FILES['photo']['name']);
            $destination = $catPath . '/' . $fileName;
            
            if (move_uploaded_file($tmpName, $destination)) {
                echo json_encode([
                    "success" => true, 
                    "url" => '/uploads/portfolio/' . rawurlencode($category) . '/' . rawurlencode($fileName)
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Errore durante il salvataggio del file"]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["error" => "Nessun file caricato o errore nell'upload"]);
        }
        break;

    case 'deleteImage':
        $data = json_decode(file_get_contents('php://input'), true);
        $url = isset($data['url']) ? $data['url'] : '';
        
        if (empty($url)) {
            http_response_code(400);
            echo json_encode(["error" => "URL mancante"]);
            exit;
        }

        // Convert URL (e.g. /uploads/portfolio/Eventi/123.jpg) back to absolute path
        $relativePath = urldecode(preg_replace('/^\/uploads\//', '', $url));
        $absolutePath = __DIR__ . '/uploads/' . $relativePath;
        
        if (file_exists($absolutePath) && !is_dir($absolutePath)) {
            unlink($absolutePath);
            echo json_encode(["success" => true, "message" => "Immagine eliminata"]);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Immagine non trovata sul server"]);
        }
        break;

    default:
        http_response_code(400);
        echo json_encode(["error" => "Azione non valida"]);
        break;
}
