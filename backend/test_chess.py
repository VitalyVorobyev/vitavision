import numpy as np
import chess_corners

# Create a synthetic 3x3 checkerboard
board = np.zeros((300, 300), dtype=np.uint8)
board[0:100, 100:200] = 255
board[100:200, 0:100] = 255
board[100:200, 200:300] = 255
board[200:300, 100:200] = 255

cfg = chess_corners.ChessConfig()
res = chess_corners.find_chess_corners(board, cfg)

print(f"Type: {type(res)}")
if isinstance(res, np.ndarray):
    print(f"Shape: {res.shape}")
    print(f"Data:\n{res[:5]}")
else:
    print(res)
