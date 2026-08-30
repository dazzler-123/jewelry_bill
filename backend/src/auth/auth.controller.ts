import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../schemas/user.schema';

interface LoginDto {
  email?: string;
  password?: string;
}

@Controller('auth')
export class AuthController implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    const userCount = await this.userModel.countDocuments();
    if (userCount === 0) {
      const passwordHash = await bcrypt.hash('Admin@1234', 10);
      await this.userModel.create({
        name: 'System Admin',
        email: 'admin@jewelryshop.com',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      });
      console.log(
        'Seeded default admin user: admin@jewelryshop.com / Admin@1234',
      );
    }
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const email = body.email;
    const password = body.password;
    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required');
    }
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or inactive account');
    }
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const token = await this.jwtService.signAsync(payload);
    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
